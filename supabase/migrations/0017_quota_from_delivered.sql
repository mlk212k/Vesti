-- Vesti — le quota découle des analyses RÉELLEMENT rendues
--
-- ⚠️ Le défaut corrigé, observé en vrai : deux comptes avaient un crédit
-- décompté pour une analyse jamais rendue.
--
-- Le compteur `analyses_used` était incrémenté AVANT l'appel au modèle (à
-- raison : c'est le seul rempart contre des appels en boucle), et remis en
-- place par `refund_analysis_quota()` en cas d'échec. Mais ce remboursement
-- vit dans le `catch` du serveur. Quand la fonction est TUÉE en vol — délai
-- dépassé, client déconnecté sur un réseau mobile — le `catch` ne s'exécute
-- jamais. Le compteur reste haut, l'analyse n'existe pas, et rien ne le
-- signale. Le compteur dérive, silencieusement et toujours dans le même sens :
-- contre l'utilisateur.
--
-- Un compteur qu'on incrémente d'un côté et qu'on espère décrémenter de
-- l'autre finit toujours par mentir. Le principe change donc :
--
--   ce qui fait foi, c'est la ligne dans `analyses`.
--
-- Une analyse rendue laisse une trace ; une analyse morte n'en laisse aucune.
-- Le quota se recalcule à partir de ces traces, donc il se répare tout seul.
--
-- Le compteur ne disparaît pas pour autant : il resterait un trou de quelques
-- dizaines de secondes entre la consommation et l'écriture de l'analyse, par
-- lequel des requêtes simultanées passeraient toutes. D'où les RÉSERVATIONS
-- ci-dessous : elles couvrent exactement cet intervalle, et elles expirent.
-- Une réservation abandonnée cesse de compter au bout de quelques minutes,
-- au lieu de peser jusqu'à la fin du mois.

-- ---------------------------------------------------------------------------
-- Les analyses en cours de route
-- ---------------------------------------------------------------------------
create table public.analysis_reservations (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  kind       text not null check (kind in ('outfit', 'dressing')),
  created_at timestamptz not null default now()
);

create index analysis_reservations_user_idx
  on public.analysis_reservations (user_id, created_at desc);

-- Compter les analyses d'une période devient une opération courante.
create index if not exists analyses_user_period_idx
  on public.analyses (user_id, created_at desc);

-- 🔒 Aucun GRANT : cette table décide de ce que quelqu'un a le droit de
-- consommer. Seules les fonctions SECURITY DEFINER ci-dessous y touchent.
-- RLS activé sans policy = fermé, ceinture et bretelles.
alter table public.analysis_reservations enable row level security;

comment on table public.analysis_reservations is
  'Analyses lancées mais pas encore rendues. Expirent seules : une requête tuée en vol ne doit pas coûter un crédit.';

-- ---------------------------------------------------------------------------
-- Durée de vie d'une réservation
--
-- Doit dépasser confortablement la durée d'une analyse (~20-40 s, et jusqu'à
-- 120 s au pire) sans immobiliser un crédit longtemps quand la requête est
-- morte. Cinq minutes laissent trois fois la marge du pire cas.
-- ---------------------------------------------------------------------------
create or replace function public.reservation_ttl()
returns interval language sql immutable set search_path = '' as $$
  select interval '5 minutes';
$$;

-- ---------------------------------------------------------------------------
-- Ce qui a été consommé sur la période : le rendu, plus ce qui est en route.
-- ---------------------------------------------------------------------------
create or replace function public.quota_used(p_user uuid, p_since timestamptz)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select (
    (select count(*) from public.analyses a
      where a.user_id = p_user and a.created_at >= p_since)
    +
    (select count(*) from public.analysis_reservations r
      where r.user_id = p_user
        -- Deux bornes, chacune pour une raison distincte :
        --   • la période : une réservation appartient au mois où elle est née,
        --     sinon un renouvellement n'effacerait pas vraiment l'ardoise ;
        --   • le délai d'expiration : c'est lui qui rend le crédit après une
        --     requête tuée en vol.
        and r.created_at >= p_since
        and r.created_at > now() - public.reservation_ttl())
  )::integer;
$$;

-- ---------------------------------------------------------------------------
-- consume_analysis_quota : réserve un crédit, au lieu d'incrémenter un total
-- ---------------------------------------------------------------------------
-- La signature gagne une colonne (`reservation_id`), et Postgres refuse de
-- changer le type de retour d'une fonction par un simple `replace`. Les droits
-- disparaissent avec la fonction : ils sont réattribués en fin de fichier.
drop function if exists public.consume_analysis_quota(text);

create function public.consume_analysis_quota(p_kind text default 'outfit')
returns table (
  allowed        boolean,
  reason         text,
  used_count     integer,
  limit_total    integer,
  remaining      integer,
  plan_code      text,
  reservation_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid   uuid := auth.uid();
  v_plan  text;
  v_start timestamptz;
  v_used  integer;
  v_limit integer;
  v_res   uuid;
begin
  if v_uid is null then
    return query select false, 'unauthenticated', 0, 0, 0, 'free', null::uuid;
    return;
  end if;

  if p_kind not in ('outfit', 'dressing') then
    return query select false, 'invalid_kind', 0, 0, 0, 'free', null::uuid;
    return;
  end if;

  -- Verrou de ligne : deux requêtes simultanées du même utilisateur se
  -- sérialisent ici. C'est ce qui rend le comptage ci-dessous fiable.
  select public.effective_plan(p.plan, p.gift_plan, p.gift_plan_until), p.period_start
    into v_plan, v_start
  from public.profiles p
  where p.id = v_uid
  for update;

  if not found then
    return query select false, 'no_profile', 0, 0, 0, 'free', null::uuid;
    return;
  end if;

  -- Renouvellement mensuel glissant.
  if v_start + interval '1 month' <= now() then
    v_start := now();
    update public.profiles p
       set analyses_used = 0, period_start = v_start
     where p.id = v_uid;
  end if;

  -- Les réservations périmées cessent de compter. C'est ici que le quota se
  -- répare tout seul après une requête tuée en vol.
  delete from public.analysis_reservations r
   where r.user_id = v_uid
     and r.created_at <= now() - public.reservation_ttl();

  v_used  := public.quota_used(v_uid, v_start);
  v_limit := public.plan_analysis_limit(v_plan);

  if p_kind = 'dressing' and not public.plan_allows_dressing(v_plan) then
    return query select false, 'plan_required', v_used, v_limit,
                        greatest(v_limit - v_used, 0), v_plan, null::uuid;
    return;
  end if;

  if v_used >= v_limit then
    return query select false,
                        case when v_plan = 'free' then 'quota_exceeded'
                             else 'fair_use_reached' end,
                        v_used, v_limit, 0, v_plan, null::uuid;
    return;
  end if;

  insert into public.analysis_reservations (user_id, kind)
  values (v_uid, p_kind)
  returning id into v_res;

  v_used := v_used + 1;

  -- Miroir pour l'affichage. Il n'a plus autorité sur rien : s'il dérive, le
  -- prochain appel le recale sur la vérité.
  update public.profiles p set analyses_used = v_used where p.id = v_uid;

  return query select true, null::text, v_used, v_limit,
                      greatest(v_limit - v_used, 0), v_plan, v_res;
end;
$$;

-- ---------------------------------------------------------------------------
-- release_analysis_quota : la réservation a fait son office, on la retire
--
-- Appelée dans les DEUX cas, et c'est le point important :
--   • échec  → le crédit n'a jamais été consommé ;
--   • succès → la ligne dans `analyses` prend le relais du comptage.
--
-- Sans l'appel en cas de succès, l'analyse serait comptée deux fois pendant
-- cinq minutes : une fois comme rendue, une fois comme encore en route.
--
-- Et si l'appel n'a jamais lieu — c'est tout l'intérêt — la réservation
-- expire d'elle-même. Plus rien ne dépend de la survie du serveur.
-- ---------------------------------------------------------------------------
create or replace function public.release_analysis_quota(p_reservation uuid)
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

  -- Le filtre sur user_id est la garde : un identifiant deviné ne libère pas
  -- la réservation de quelqu'un d'autre.
  if p_reservation is not null then
    delete from public.analysis_reservations r
     where r.id = p_reservation and r.user_id = v_uid;
  else
    -- Sans identifiant, on retire la plus récente : c'est le comportement
    -- attendu de l'ancien `refund_analysis_quota()`, qu'on garde valable.
    delete from public.analysis_reservations r
     where r.id = (
       select r2.id from public.analysis_reservations r2
        where r2.user_id = v_uid
        order by r2.created_at desc
        limit 1
     );
  end if;

  update public.profiles p
     set analyses_used = public.quota_used(v_uid, p.period_start)
   where p.id = v_uid;
end;
$$;

-- Ancien nom conservé : il ne prend pas d'argument et libère la plus récente.
create or replace function public.refund_analysis_quota()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.release_analysis_quota(null);
end;
$$;

-- ---------------------------------------------------------------------------
-- get_quota_status : lit la même vérité que l'enforcement
--
-- Avant, l'affichage lisait le compteur et l'enforcement aussi : les deux
-- mentaient ensemble, ce qui rendait la dérive invisible. Les deux lisent
-- désormais les analyses rendues.
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
  v_start timestamptz;
  v_used  integer;
  v_limit integer;
begin
  if v_uid is null then
    return;
  end if;

  select public.effective_plan(p.plan, p.gift_plan, p.gift_plan_until), p.period_start
    into v_plan, v_start
  from public.profiles p
  where p.id = v_uid;

  if not found then
    return;
  end if;

  -- Renouvellement appliqué virtuellement : un affichage ne doit pas écrire.
  if v_start + interval '1 month' <= now() then
    v_start := now();
  end if;

  v_used  := public.quota_used(v_uid, v_start);
  v_limit := public.plan_analysis_limit(v_plan);

  return query select v_used, v_limit, greatest(v_limit - v_used, 0),
                      v_plan, v_start + interval '1 month';
end;
$$;

-- ---------------------------------------------------------------------------
-- Permissions
-- ---------------------------------------------------------------------------
revoke execute on function public.quota_used(uuid, timestamptz) from public, anon, authenticated;
revoke execute on function public.consume_analysis_quota(text)  from public, anon;
revoke execute on function public.release_analysis_quota(uuid)  from public, anon;
revoke execute on function public.refund_analysis_quota()       from public, anon;
revoke execute on function public.get_quota_status()            from public, anon;

grant execute on function public.consume_analysis_quota(text) to authenticated;
grant execute on function public.release_analysis_quota(uuid) to authenticated;
grant execute on function public.refund_analysis_quota()      to authenticated;
grant execute on function public.get_quota_status()           to authenticated;
