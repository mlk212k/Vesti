-- Vesti — parrainage entre utilisateurs, récompensé en « Style »
--
-- Chaque personne a son propre code. Quand un filleul l'utilise ET fait sa
-- première analyse, le parrain gagne des Style. À 100 Style, il échange contre
-- six mois de plan Styliste.
--
-- ⚠️ À ne pas confondre avec `referral_codes` (migration 0005) : celle-là sert
-- au suivi des partenariats, ces codes-là sont créés à la main par l'éditeur.
-- Ici, chaque utilisateur génère le sien.

-- ---------------------------------------------------------------------------
-- Paramètres du programme, en un seul endroit
--
-- 💰 Ces deux nombres décident si le programme gagne ou perd de l'argent.
-- 10 Style par filleul et 100 Style pour six mois de Styliste signifient :
-- 10 filleuls = 6 × 17,99 € = ~108 € offerts. Le programme n'est rentable que
-- si un filleul rapporte en moyenne plus de ~11 €. À ajuster avec de vrais
-- chiffres de conversion, pas avant.
-- ---------------------------------------------------------------------------
create or replace function public.style_per_referral()
returns integer language sql immutable set search_path = '' as $$ select 10 $$;

create or replace function public.style_gift_threshold()
returns integer language sql immutable set search_path = '' as $$ select 100 $$;

create or replace function public.style_gift_months()
returns integer language sql immutable set search_path = '' as $$ select 6 $$;

-- ---------------------------------------------------------------------------
-- Colonnes
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column style_balance integer not null default 0 check (style_balance >= 0),

  -- Code personnel, distribué par l'utilisateur. Court et sans caractères
  -- ambigus : il se dicte à voix haute et se tape sur un clavier de téléphone.
  add column own_code text unique,

  -- Qui a parrainé cette personne. Écrit une seule fois, jamais modifiable :
  -- sans ça, on pourrait changer de parrain après coup et créditer deux fois.
  add column referred_by uuid references public.profiles (id) on delete set null,
  add column referred_by_at timestamptz,

  -- Date de la récompense. Sa présence interdit un second versement pour le
  -- même filleul, quoi qu'il arrive ensuite.
  add column referral_rewarded_at timestamptz,

  -- Plan offert, hors Stripe. Séparé de `plan` (qui appartient au webhook) :
  -- les mélanger ferait écraser le cadeau au premier événement Stripe venu.
  add column gift_plan text check (gift_plan in ('pro', 'styliste')),
  add column gift_plan_until timestamptz;

create index profiles_referred_by_idx on public.profiles (referred_by);

-- ---------------------------------------------------------------------------
-- Journal des mouvements
--
-- Un solde sans historique est indéfendable : le jour où quelqu'un conteste ses
-- Style, il faut pouvoir dire d'où vient chaque point.
-- ---------------------------------------------------------------------------
create table public.style_events (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  amount      integer not null,
  reason      text not null check (reason in ('referral', 'gift_redeemed')),
  -- Filleul concerné, pour un gain de parrainage.
  related_id  uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now()
);

create index style_events_user_idx on public.style_events (user_id, created_at desc);

alter table public.style_events enable row level security;

create policy style_events_select_own on public.style_events
  for select to authenticated
  using (auth.uid() = user_id);

-- Écriture réservée aux fonctions ci-dessous : un solde que le client peut
-- écrire n'est pas un solde.
revoke insert, update, delete on public.style_events from anon, authenticated;
revoke update (style_balance, own_code, referred_by, referred_by_at,
               referral_rewarded_at, gift_plan, gift_plan_until)
  on public.profiles from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Génération du code personnel
--
-- Alphabet sans 0/O ni 1/I/L : ces codes se dictent au téléphone et se
-- recopient depuis une story. Une confusion de caractère, c'est un parrainage
-- perdu et un utilisateur qui croit le programme cassé.
-- ---------------------------------------------------------------------------
create or replace function public.generate_style_code()
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  v_code text;
  v_try  integer := 0;
begin
  loop
    v_code := '';
    for i in 1..6 loop
      v_code := v_code || substr(
        v_alphabet, 1 + floor(random() * length(v_alphabet))::int, 1
      );
    end loop;

    exit when not exists (
      select 1 from public.profiles p where p.own_code = v_code
    );

    v_try := v_try + 1;
    if v_try > 50 then
      raise exception 'impossible de générer un code unique';
    end if;
  end loop;

  return v_code;
end;
$$;

-- Chaque profil existant en reçoit un.
update public.profiles
   set own_code = public.generate_style_code()
 where own_code is null;

-- Et chaque nouveau profil aussi, à l'inscription.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, own_code)
  values (new.id, new.email, public.generate_style_code())
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Plan effectif = plan payé, ou plan offert s'il est meilleur et encore valide
--
-- Le cadeau ne touche jamais `plan` : Stripe reste seul maître de cette
-- colonne. On compare les deux à la lecture.
-- ---------------------------------------------------------------------------
create or replace function public.plan_rank(p_plan text)
returns integer
language sql
immutable
set search_path = ''
as $$
  select case p_plan when 'styliste' then 3 when 'pro' then 2 else 1 end;
$$;

create or replace function public.effective_plan(
  p_plan text, p_gift text, p_gift_until timestamptz
)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when p_gift is not null
     and p_gift_until is not null
     and p_gift_until > now()
     and public.plan_rank(p_gift) > public.plan_rank(coalesce(p_plan, 'free'))
    then p_gift
    else coalesce(p_plan, 'free')
  end;
$$;

-- ---------------------------------------------------------------------------
-- Enregistrer le code d'un parrain
-- ---------------------------------------------------------------------------
create or replace function public.redeem_style_code(p_code text)
returns table (accepted boolean, reason text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid     uuid := auth.uid();
  v_code    text := public.normalize_referral_code(p_code);
  v_parrain uuid;
  v_deja    uuid;
begin
  if v_uid is null then
    return query select false, 'unauthenticated';
    return;
  end if;

  select p.referred_by into v_deja
  from public.profiles p where p.id = v_uid for update;

  -- Définitif : changer de parrain après coup permettrait de faire créditer
  -- plusieurs personnes avec un seul filleul.
  if v_deja is not null then
    return query select false, 'already_referred';
    return;
  end if;

  select p.id into v_parrain
  from public.profiles p
  where p.own_code = v_code;

  if v_parrain is null then
    return query select false, 'unknown_code';
    return;
  end if;

  -- Se parrainer soi-même serait la première chose que quelqu'un essaierait.
  if v_parrain = v_uid then
    return query select false, 'self_referral';
    return;
  end if;

  update public.profiles p
     set referred_by = v_parrain,
         referred_by_at = now()
   where p.id = v_uid;

  return query select true, null::text;
end;
$$;

-- ---------------------------------------------------------------------------
-- Verser les Style au parrain
--
-- ⚠️ Appelée après la PREMIÈRE ANALYSE du filleul, pas à son inscription.
-- Récompenser l'inscription, c'est payer des adresses jetables : dix comptes
-- créés en cinq minutes suffiraient à s'offrir six mois. Exiger une analyse
-- réelle rend la fraude aussi coûteuse que l'usage.
--
-- ⚠️ Et c'est pour ça qu'elle prend l'utilisateur en paramètre au lieu de lire
-- `auth.uid()` : exposée au navigateur, elle serait appelable directement, et
-- la condition « après une vraie analyse » ne vaudrait plus rien — il
-- suffirait d'appeler le RPC juste après l'inscription. Seul le serveur
-- (clé service_role), qui vient de constater l'analyse, peut la déclencher.
-- ---------------------------------------------------------------------------
create or replace function public.award_referral_style(p_user uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid     uuid := p_user;
  v_parrain uuid;
  v_deja    timestamptz;
  v_montant integer := public.style_per_referral();
begin
  if v_uid is null then
    return;
  end if;

  select p.referred_by, p.referral_rewarded_at
    into v_parrain, v_deja
  from public.profiles p
  where p.id = v_uid
  for update;

  -- Pas de parrain, ou déjà payé : rien à faire. Le second cas est la garde
  -- qui rend cette fonction sûre à appeler à chaque analyse.
  if v_parrain is null or v_deja is not null then
    return;
  end if;

  update public.profiles p
     set referral_rewarded_at = now()
   where p.id = v_uid;

  update public.profiles p
     set style_balance = p.style_balance + v_montant
   where p.id = v_parrain;

  insert into public.style_events (user_id, amount, reason, related_id)
  values (v_parrain, v_montant, 'referral', v_uid);
end;
$$;

-- ---------------------------------------------------------------------------
-- Échanger 100 Style contre six mois de Styliste
-- ---------------------------------------------------------------------------
create or replace function public.redeem_style_gift()
returns table (accepted boolean, reason text, until timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid    uuid := auth.uid();
  v_solde  integer;
  v_actuel timestamptz;
  v_seuil  integer := public.style_gift_threshold();
  v_mois   integer := public.style_gift_months();
  v_fin    timestamptz;
begin
  if v_uid is null then
    return query select false, 'unauthenticated', null::timestamptz;
    return;
  end if;

  select p.style_balance, p.gift_plan_until
    into v_solde, v_actuel
  from public.profiles p
  where p.id = v_uid
  for update;

  if v_solde is null then
    return query select false, 'no_profile', null::timestamptz;
    return;
  end if;

  if v_solde < v_seuil then
    return query select false, 'not_enough_style', null::timestamptz;
    return;
  end if;

  -- Un cadeau encore en cours se prolonge au lieu d'être écrasé : sinon
  -- échanger deux fois de suite ferait perdre les mois restants.
  v_fin := greatest(coalesce(v_actuel, now()), now())
           + (v_mois || ' months')::interval;

  update public.profiles p
     set style_balance = p.style_balance - v_seuil,
         gift_plan = 'styliste',
         gift_plan_until = v_fin
   where p.id = v_uid;

  insert into public.style_events (user_id, amount, reason)
  values (v_uid, -v_seuil, 'gift_redeemed');

  return query select true, null::text, v_fin;
end;
$$;

-- ---------------------------------------------------------------------------
-- Le quota tient compte du plan offert
-- ---------------------------------------------------------------------------
create or replace function public.consume_analysis_quota(p_kind text default 'outfit')
returns table (
  allowed boolean, reason text, used_count integer,
  limit_total integer, remaining integer, plan_code text
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

  select public.effective_plan(p.plan, p.gift_plan, p.gift_plan_until),
         p.analyses_used, p.period_start
    into v_plan, v_used, v_start
  from public.profiles p
  where p.id = v_uid
  for update;

  if not found then
    return query select false, 'no_profile', 0, 0, 0, 'free';
    return;
  end if;

  if v_start + interval '1 month' <= now() then
    v_used  := 0;
    v_start := now();
    update public.profiles p
       set analyses_used = 0, period_start = v_start
     where p.id = v_uid;
  end if;

  v_limit := public.plan_analysis_limit(v_plan);

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

create or replace function public.get_quota_status()
returns table (
  used_count integer, limit_total integer, remaining integer,
  plan_code text, period_end timestamptz
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

  select public.effective_plan(p.plan, p.gift_plan, p.gift_plan_until),
         p.analyses_used, p.period_start
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
-- Permissions
-- ---------------------------------------------------------------------------
revoke execute on function public.redeem_style_code(text) from public, anon;
revoke execute on function public.redeem_style_gift()    from public, anon;
revoke execute on function public.generate_style_code()  from public, anon, authenticated;

grant execute on function public.redeem_style_code(text) to authenticated;
grant execute on function public.redeem_style_gift()    to authenticated;

-- Le versement n'est PAS ouvert au navigateur : cf. le commentaire de la
-- fonction. Le serveur l'appelle avec la clé service_role après une analyse
-- réellement effectuée.
revoke execute on function public.award_referral_style(uuid)
  from public, anon, authenticated;
