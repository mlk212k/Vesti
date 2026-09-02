-- Vesti — quota d'analyses (atomique)
--
-- Le quota est la seule chose qui empêche un utilisateur gratuit de déclencher
-- des appels Claude en boucle. Il DOIT donc être consommé de façon atomique :
-- un check en JS suivi d'un update en JS laisse passer N requêtes parallèles
-- lancées avant le premier update ("check-then-act"). Ici le SELECT ... FOR
-- UPDATE verrouille la ligne de profil, ce qui sérialise les appels concurrents.

-- ---------------------------------------------------------------------------
-- Limites par plan. Source de vérité de l'enforcement (lib/plans.ts n'en est
-- que le reflet pour l'affichage). Les plans payants ont un garde-fou fair-use
-- plutôt qu'un vrai infini : une analyse coûte ~0,02-0,04 € en tokens.
-- ---------------------------------------------------------------------------
create or replace function public.plan_analysis_limit(p_plan text)
returns integer
language sql
immutable
as $$
  select case p_plan
    when 'free'     then 3
    when 'pro'      then 150
    when 'styliste' then 300
    else 0
  end;
$$;

create or replace function public.plan_allows_dressing(p_plan text)
returns boolean
language sql
immutable
as $$
  select p_plan in ('pro', 'styliste');
$$;

-- ---------------------------------------------------------------------------
-- consume_analysis_quota : à appeler AVANT tout appel à l'API Claude.
-- Renvoie allowed=false avec une raison exploitable côté UI plutôt que de lever
-- une exception, pour pouvoir afficher un CTA d'upgrade adapté.
-- ---------------------------------------------------------------------------
create or replace function public.consume_analysis_quota(p_kind text default 'outfit')
returns table (
  allowed      boolean,
  reason       text,
  used_count   integer,
  limit_total  integer,
  remaining    integer,
  plan_code    text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid   uuid := auth.uid();
  v_plan  text;
  v_used  integer;
  v_start timestamptz;
  v_limit integer;
begin
  if v_uid is null then
    return query select false, 'unauthenticated', 0, 0, 0, 'free';
    return;
  end if;

  if p_kind not in ('outfit', 'dressing') then
    return query select false, 'invalid_kind', 0, 0, 0, 'free';
    return;
  end if;

  -- Verrou de ligne : deux requêtes simultanées du même user se sérialisent ici.
  select p.plan, p.analyses_used, p.period_start
    into v_plan, v_used, v_start
  from public.profiles p
  where p.id = v_uid
  for update;

  if not found then
    return query select false, 'no_profile', 0, 0, 0, 'free';
    return;
  end if;

  -- Renouvellement mensuel glissant
  if v_start + interval '1 month' <= now() then
    v_used  := 0;
    v_start := now();
    update public.profiles p
       set analyses_used = 0, period_start = v_start
     where p.id = v_uid;
  end if;

  v_limit := public.plan_analysis_limit(v_plan);

  -- Verrou de fonctionnalité : le dressing complet est réservé au Pro+
  if p_kind = 'dressing' and not public.plan_allows_dressing(v_plan) then
    return query select false, 'plan_required', v_used, v_limit,
                        greatest(v_limit - v_used, 0), v_plan;
    return;
  end if;

  if v_used >= v_limit then
    return query select false,
                        case when v_plan = 'free' then 'quota_exceeded'
                             else 'fair_use_reached' end,
                        v_used, v_limit, 0, v_plan;
    return;
  end if;

  update public.profiles p
     set analyses_used = p.analyses_used + 1
   where p.id = v_uid;

  v_used := v_used + 1;

  return query select true, null::text, v_used, v_limit,
                      greatest(v_limit - v_used, 0), v_plan;
end;
$$;

-- ---------------------------------------------------------------------------
-- refund_analysis_quota : si l'appel Claude échoue après consommation, on rend
-- le crédit. Sans ça, une panne côté API fait perdre une analyse à un
-- utilisateur gratuit qui n'en a que 3.
-- ---------------------------------------------------------------------------
create or replace function public.refund_analysis_quota()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    return;
  end if;

  update public.profiles p
     set analyses_used = greatest(p.analyses_used - 1, 0)
   where p.id = v_uid;
end;
$$;

-- ---------------------------------------------------------------------------
-- get_quota_status : lecture seule pour le dashboard. Applique le
-- renouvellement de façon "virtuelle" (sans écrire) pour ne pas transformer un
-- simple affichage en écriture.
-- ---------------------------------------------------------------------------
create or replace function public.get_quota_status()
returns table (
  used_count   integer,
  limit_total  integer,
  remaining    integer,
  plan_code    text,
  period_end   timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid   uuid := auth.uid();
  v_plan  text;
  v_used  integer;
  v_start timestamptz;
  v_limit integer;
begin
  if v_uid is null then
    return;
  end if;

  select p.plan, p.analyses_used, p.period_start
    into v_plan, v_used, v_start
  from public.profiles p
  where p.id = v_uid;

  if not found then
    return;
  end if;

  if v_start + interval '1 month' <= now() then
    v_used  := 0;
    v_start := now();
  end if;

  v_limit := public.plan_analysis_limit(v_plan);

  return query select v_used, v_limit, greatest(v_limit - v_used, 0),
                      v_plan, v_start + interval '1 month';
end;
$$;

-- ---------------------------------------------------------------------------
-- Permissions d'exécution
-- ---------------------------------------------------------------------------
revoke execute on function public.consume_analysis_quota(text) from public, anon;
revoke execute on function public.refund_analysis_quota()      from public, anon;
revoke execute on function public.get_quota_status()           from public, anon;

grant execute on function public.consume_analysis_quota(text) to authenticated;
grant execute on function public.refund_analysis_quota()      to authenticated;
grant execute on function public.get_quota_status()           to authenticated;
