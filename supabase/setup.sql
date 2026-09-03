-- =====================================================================
-- Vesti — installation complète de la base, en un seul fichier
-- =====================================================================
--
-- Les migrations de `supabase/migrations/` mises bout à bout, dans l'ordre,
-- pour n'avoir qu'un seul copier-coller à faire dans le SQL Editor de Supabase
-- lors de la première installation.
--
-- Les fichiers numérotés restent la référence : toute modification ultérieure
-- se fait là-bas, dans une NOUVELLE migration. Ce fichier ne sert qu'au
-- démarrage d'un projet vide.
--
-- À exécuter une seule fois, sur une base neuve.
-- =====================================================================


-- ─────────────────────────────────────────────────────────────────────
-- 0001_schema.sql
-- ─────────────────────────────────────────────────────────────────────

-- Vesti — schéma initial
-- profiles / analyses / dressing_items / subscriptions / stripe_events

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- profiles : 1 ligne par utilisateur auth. Porte aussi le compteur de quota,
-- volontairement sur la même ligne que le plan pour qu'un seul verrou de ligne
-- suffise à sérialiser la consommation de quota (cf. 0003_quota_rpc.sql).
-- ---------------------------------------------------------------------------
create table public.profiles (
  id                  uuid primary key references auth.users (id) on delete cascade,
  email               text,

  -- onboarding (tout optionnel : sert à personnaliser l'analyse)
  gender              text check (gender in ('femme', 'homme', 'non-binaire', 'non-precise')),
  height_cm           integer check (height_cm between 100 and 250),
  morphology          text check (morphology in ('sablier', 'triangle', 'triangle-inverse', 'rectangle', 'ovale', 'non-precise')),
  style_prefs         jsonb not null default '[]'::jsonb,
  onboarded_at        timestamptz,

  -- facturation / quota
  plan                text not null default 'free' check (plan in ('free', 'pro', 'styliste')),
  analyses_used       integer not null default 0 check (analyses_used >= 0),
  period_start        timestamptz not null default now(),
  stripe_customer_id  text unique,

  created_at          timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- analyses : historique des verdicts rendus par Claude
-- ---------------------------------------------------------------------------
create table public.analyses (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.profiles (id) on delete cascade,
  kind           text not null check (kind in ('outfit', 'dressing')),
  image_paths    text[] not null default '{}',
  verdict        jsonb not null,
  score          integer check (score between 0 and 100),
  occasion       text,

  -- suivi de coût : indispensable pour surveiller la marge du plan illimité
  model          text,
  input_tokens   integer,
  output_tokens  integer,

  created_at     timestamptz not null default now()
);

create index analyses_user_created_idx on public.analyses (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- dressing_items : pièces identifiées dans le dressing (Pro+)
-- ---------------------------------------------------------------------------
create table public.dressing_items (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles (id) on delete cascade,
  analysis_id  uuid references public.analyses (id) on delete set null,
  category     text not null check (category in ('haut', 'bas', 'robe', 'veste', 'chaussures', 'accessoire', 'autre')),
  label        text not null,
  color        text,
  season       text check (season in ('toutes', 'ete', 'hiver', 'mi-saison')),
  image_path   text,
  created_at   timestamptz not null default now()
);

create index dressing_items_user_idx on public.dressing_items (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- subscriptions : miroir local de l'abonnement Stripe (source = webhook)
-- ---------------------------------------------------------------------------
create table public.subscriptions (
  id                      uuid primary key default gen_random_uuid(),
  user_id                 uuid not null references public.profiles (id) on delete cascade,
  stripe_subscription_id  text not null unique,
  stripe_customer_id      text not null,
  stripe_price_id         text,
  plan                    text not null check (plan in ('free', 'pro', 'styliste')),
  status                  text not null,
  current_period_end      timestamptz,
  cancel_at_period_end    boolean not null default false,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

create index subscriptions_user_idx on public.subscriptions (user_id);

-- ---------------------------------------------------------------------------
-- stripe_events : idempotence du webhook. Stripe rejoue les events ; sans cette
-- table un rejeu ré-applique le changement de plan (ou double un crédit).
-- ---------------------------------------------------------------------------
create table public.stripe_events (
  id            text primary key,
  type          text not null,
  processed_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Création automatique du profil à l'inscription
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─────────────────────────────────────────────────────────────────────
-- 0002_rls.sql
-- ─────────────────────────────────────────────────────────────────────

-- Vesti — Row Level Security
--
-- Principe : le client ne peut QUE lire ses propres lignes. Toute écriture
-- qui a une conséquence (plan, quota, analyses, abonnement) passe soit par le
-- service_role côté serveur, soit par une fonction SECURITY DEFINER contrôlée.

alter table public.profiles       enable row level security;
alter table public.analyses       enable row level security;
alter table public.dressing_items enable row level security;
alter table public.subscriptions  enable row level security;
alter table public.stripe_events  enable row level security;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create policy profiles_select_own on public.profiles
  for select to authenticated
  using (auth.uid() = id);

create policy profiles_update_own on public.profiles
  for update to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ⚠️ Point de sécurité central : RLS filtre par LIGNE, jamais par COLONNE.
-- Avec la seule policy ci-dessus, n'importe quel utilisateur pourrait faire
--   update profiles set plan = 'styliste', analyses_used = 0 where id = <soi>
-- et s'offrir le plan payant + un quota infini depuis le navigateur.
-- On coupe donc l'UPDATE global et on ne rouvre que les colonnes d'onboarding.
revoke update on public.profiles from anon, authenticated;
grant update (gender, height_cm, morphology, style_prefs, onboarded_at)
  on public.profiles to authenticated;

-- Les colonnes plan / analyses_used / period_start / stripe_customer_id ne sont
-- donc écrivables que par le service_role (webhook Stripe) et par les fonctions
-- SECURITY DEFINER de 0003_quota_rpc.sql.

-- ---------------------------------------------------------------------------
-- analyses : lecture seule côté client, écriture par la route API (service_role)
-- ---------------------------------------------------------------------------
create policy analyses_select_own on public.analyses
  for select to authenticated
  using (auth.uid() = user_id);

revoke insert, update, delete on public.analyses from anon, authenticated;

-- ---------------------------------------------------------------------------
-- dressing_items : idem
-- ---------------------------------------------------------------------------
create policy dressing_items_select_own on public.dressing_items
  for select to authenticated
  using (auth.uid() = user_id);

revoke insert, update, delete on public.dressing_items from anon, authenticated;

-- ---------------------------------------------------------------------------
-- subscriptions : lecture seule (affichage du plan), écriture par le webhook
-- ---------------------------------------------------------------------------
create policy subscriptions_select_own on public.subscriptions
  for select to authenticated
  using (auth.uid() = user_id);

revoke insert, update, delete on public.subscriptions from anon, authenticated;

-- ---------------------------------------------------------------------------
-- stripe_events : purement interne, aucune policy => invisible au client
-- ---------------------------------------------------------------------------
revoke all on public.stripe_events from anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────
-- 0003_quota_rpc.sql
-- ─────────────────────────────────────────────────────────────────────

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

-- ─────────────────────────────────────────────────────────────────────
-- 0004_storage_and_wardrobe.sql
-- ─────────────────────────────────────────────────────────────────────

-- Vesti — stockage des photos + enrichissement de la garde-robe
--
-- Objectif : une photo de tenue alimente automatiquement la garde-robe, chaque
-- pièce (chaussures comprises) devenant une fiche avec sa propre vignette.

-- ---------------------------------------------------------------------------
-- Bucket privé. Les photos sont des images de personnes : jamais public, accès
-- uniquement par URL signée à durée courte.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'outfits',
  'outfits',
  false,
  10485760, -- 10 Mo : large pour une photo de téléphone, ferme la porte aux abus
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic']
)
on conflict (id) do nothing;

-- Chaque utilisateur est cloisonné dans un dossier portant son id : le premier
-- segment du chemin doit être son uid.
create policy "outfits_insert_own_folder" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'outfits'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "outfits_select_own_folder" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'outfits'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "outfits_delete_own_folder" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'outfits'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ---------------------------------------------------------------------------
-- Fiche produit d'une pièce
-- ---------------------------------------------------------------------------
alter table public.dressing_items
  -- Description observable, toujours renseignée
  add column material text,
  add column pattern text,
  add column fit text,

  -- Marque : uniquement si elle est réellement lisible sur la photo.
  -- `brand_confidence` interdit de présenter une supposition comme un fait.
  add column brand text,
  add column brand_confidence text
    check (brand_confidence in ('logo_visible', 'suppose', 'inconnue'))
    default 'inconnue',

  -- Vignette : au lieu d'une photo catalogue (qu'on n'a pas), on recadre la
  -- pièce dans la photo de l'utilisateur. Boîte en pourcentages de l'image
  -- d'origine, appliquée en CSS — aucun retraitement d'image serveur.
  add column source_image_path text,
  add column crop_box jsonb,

  -- Produits réels trouvés par recherche web. Présentés comme « pièces
  -- similaires », jamais comme la référence exacte de l'utilisateur.
  add column product_matches jsonb not null default '[]'::jsonb,

  -- Confiance globale de la détection (0-100)
  add column confidence integer check (confidence between 0 and 100);

comment on column public.dressing_items.brand_confidence is
  'logo_visible = marque lue sur la photo ; suppose = hypothèse à afficher comme telle ; inconnue = non identifiable.';
comment on column public.dressing_items.product_matches is
  'Résultats de recherche web vérifiés. Ne jamais y écrire une référence produit issue du seul modèle : elle serait inventée.';

-- ─────────────────────────────────────────────────────────────────────
-- 0005_referral_and_body.sql
-- ─────────────────────────────────────────────────────────────────────

-- Vesti — parrainage influenceurs + gabarit
--
-- Objectif : savoir quel influenceur a amené quel client, de façon fiable
-- (codes réels uniquement, attribution non modifiable après coup).

-- ---------------------------------------------------------------------------
-- Codes de parrainage. Un code = un influenceur / une campagne.
-- ---------------------------------------------------------------------------
create table public.referral_codes (
  code            text primary key,
  influencer_name text not null,
  -- Réseau et notes : utiles pour trier les campagnes plus tard.
  channel         text,
  notes           text,
  active          boolean not null default true,
  created_at      timestamptz not null default now()
);

-- Les codes sont saisis à la main par des humains : on normalise en majuscules
-- sans espaces pour que "lea 10", "Lea10" et "LEA10" désignent le même code.
create or replace function public.normalize_referral_code(p_code text)
returns text
language sql
immutable
as $$
  select upper(regexp_replace(coalesce(p_code, ''), '[^a-zA-Z0-9]', '', 'g'));
$$;

alter table public.referral_codes
  add constraint referral_codes_normalized
  check (code = public.normalize_referral_code(code));

-- ---------------------------------------------------------------------------
-- Attribution + gabarit sur le profil
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column referral_code text references public.referral_codes (code),
  add column referred_at   timestamptz,

  -- Facultatif. Sert uniquement à affiner les proportions conseillées ; le
  -- prompt interdit explicitement tout commentaire sur le corps.
  add column weight_kg integer check (weight_kg between 30 and 300);

create index profiles_referral_idx on public.profiles (referral_code);

comment on column public.profiles.weight_kg is
  'Facultatif. Utilisé pour ajuster les conseils de coupe, jamais restitué ni commenté à l''utilisateur.';

-- ---------------------------------------------------------------------------
-- Enregistrement du code
--
-- SECURITY DEFINER parce que `referral_code` n'est pas dans les colonnes que le
-- client peut écrire (cf. 0002_rls.sql) : sans ça, n'importe qui pourrait se
-- réattribuer au code de son choix, ou changer d'influenceur après coup et
-- fausser les statistiques de campagne.
-- ---------------------------------------------------------------------------
create or replace function public.redeem_referral_code(p_code text)
returns table (accepted boolean, reason text, influencer_name text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid       uuid := auth.uid();
  v_code      text := public.normalize_referral_code(p_code);
  v_existing  text;
  v_name      text;
begin
  if v_uid is null then
    return query select false, 'unauthenticated', null::text;
    return;
  end if;

  if v_code = '' then
    return query select false, 'empty_code', null::text;
    return;
  end if;

  select p.referral_code into v_existing
  from public.profiles p
  where p.id = v_uid
  for update;

  -- L'attribution est définitive : le premier influenceur crédité le reste.
  if v_existing is not null then
    return query select false, 'already_referred', null::text;
    return;
  end if;

  select rc.influencer_name into v_name
  from public.referral_codes rc
  where rc.code = v_code and rc.active;

  -- Un code inconnu n'est jamais enregistré : sinon les fautes de frappe et les
  -- codes inventés se retrouveraient dans les stats d'attribution.
  if v_name is null then
    return query select false, 'unknown_code', null::text;
    return;
  end if;

  update public.profiles p
     set referral_code = v_code,
         referred_at   = now()
   where p.id = v_uid;

  return query select true, null::text, v_name;
end;
$$;

/** Vérifie un code sans l'enregistrer : sert au retour visuel pendant la saisie. */
create or replace function public.check_referral_code(p_code text)
returns table (valid boolean, influencer_name text)
language sql
security definer
set search_path = public
as $$
  select true, rc.influencer_name
  from public.referral_codes rc
  where rc.code = public.normalize_referral_code(p_code)
    and rc.active
  union all
  select false, null::text
  where not exists (
    select 1 from public.referral_codes rc2
    where rc2.code = public.normalize_referral_code(p_code) and rc2.active
  );
$$;

-- ---------------------------------------------------------------------------
-- Tableau de bord d'attribution (lecture service_role / admin uniquement)
-- ---------------------------------------------------------------------------
create view public.referral_stats as
select
  rc.code,
  rc.influencer_name,
  rc.channel,
  rc.active,
  count(p.id)                                          as signups,
  count(p.id) filter (where p.plan <> 'free')          as paying_customers,
  count(p.id) filter (where p.referred_at > now() - interval '30 days') as signups_30d,
  max(p.referred_at)                                   as last_signup_at
from public.referral_codes rc
left join public.profiles p on p.referral_code = rc.code
group by rc.code, rc.influencer_name, rc.channel, rc.active;

-- ---------------------------------------------------------------------------
-- Permissions
-- ---------------------------------------------------------------------------
alter table public.referral_codes enable row level security;
-- Aucune policy : la table des codes n'est jamais lisible par le client, qui
-- pourrait sinon récupérer la liste complète des campagnes.
revoke all on public.referral_codes from anon, authenticated;

-- La vue hérite des droits de son propriétaire : on la ferme explicitement.
revoke all on public.referral_stats from anon, authenticated;

revoke execute on function public.redeem_referral_code(text) from public, anon;
revoke execute on function public.check_referral_code(text)  from public, anon;
grant execute on function public.redeem_referral_code(text) to authenticated;
grant execute on function public.check_referral_code(text)  to authenticated;

-- Le client peut renseigner son poids lui-même (colonne d'onboarding).
grant update (weight_kg) on public.profiles to authenticated;

-- ─────────────────────────────────────────────────────────────────────
-- 0006_neutral_referral.sql
-- ─────────────────────────────────────────────────────────────────────

-- Vesti — parrainage : vocabulaire neutre et cloisonnement de l'attribution
--
-- Côté client, rien ne doit laisser deviner que les codes servent au suivi des
-- partenariats. Deux conséquences :
--   1. le vocabulaire interne devient neutre ("partenaire" et non "influenceur"),
--      pour qu'aucun écran futur ne réutilise le mot par inadvertance ;
--   2. la validation d'un code ne renvoie plus le nom associé — sinon il suffit
--      de tester des codes pour cartographier tous les partenariats.

alter table public.referral_codes
  rename column influencer_name to partner_name;

-- La vue référence l'ancien nom de colonne : on la reconstruit.
drop view if exists public.referral_stats;

create view public.referral_stats as
select
  rc.code,
  rc.partner_name,
  rc.channel,
  rc.active,
  count(p.id)                                          as signups,
  count(p.id) filter (where p.plan <> 'free')          as paying_customers,
  count(p.id) filter (where p.referred_at > now() - interval '30 days') as signups_30d,
  max(p.referred_at)                                   as last_signup_at
from public.referral_codes rc
left join public.profiles p on p.referral_code = rc.code
group by rc.code, rc.partner_name, rc.channel, rc.active;

revoke all on public.referral_stats from anon, authenticated;

-- Validation d'un code : réponse strictement binaire, sans nom de partenaire.
--
-- DROP obligatoire avant recréation : la fonction perd sa colonne de retour
-- `influencer_name`, et Postgres refuse un CREATE OR REPLACE qui modifie le
-- type de retour d'une fonction existante.
drop function if exists public.redeem_referral_code(text);

create function public.redeem_referral_code(p_code text)
returns table (accepted boolean, reason text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid      uuid := auth.uid();
  v_code     text := public.normalize_referral_code(p_code);
  v_existing text;
  v_found    boolean;
begin
  if v_uid is null then
    return query select false, 'unauthenticated';
    return;
  end if;

  if v_code = '' then
    return query select false, 'empty_code';
    return;
  end if;

  select p.referral_code into v_existing
  from public.profiles p
  where p.id = v_uid
  for update;

  -- L'attribution est définitive : le premier partenaire crédité le reste.
  if v_existing is not null then
    return query select false, 'already_referred';
    return;
  end if;

  select exists (
    select 1 from public.referral_codes rc
    where rc.code = v_code and rc.active
  ) into v_found;

  -- Un code inconnu n'est jamais enregistré : sinon les fautes de frappe et les
  -- codes inventés se retrouveraient dans les statistiques d'attribution.
  if not v_found then
    return query select false, 'unknown_code';
    return;
  end if;

  update public.profiles p
     set referral_code = v_code,
         referred_at   = now()
   where p.id = v_uid;

  return query select true, null::text;
end;
$$;

-- Cette fonction exposait le nom du partenaire à qui savait deviner un code.
drop function if exists public.check_referral_code(text);

revoke execute on function public.redeem_referral_code(text) from public, anon;
grant execute on function public.redeem_referral_code(text) to authenticated;

-- ─────────────────────────────────────────────────────────────────────
-- 0007_shopping.sql
-- ─────────────────────────────────────────────────────────────────────

-- Vesti — recommandations d'achat (plan Styliste)
--
-- Les manques repérés lors d'un scan de dressing deviennent des lignes
-- durables. Deux raisons de les sortir du JSON de l'analyse :
--   1. un même manque revient d'un scan à l'autre — on veut le dédoublonner ;
--   2. la recherche de produits est facturée à l'usage, donc son résultat doit
--      être stocké et non refait à chaque affichage de la page.

create table public.shopping_suggestions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles (id) on delete cascade,
  analysis_id   uuid references public.analyses (id) on delete set null,

  item          text not null,
  -- Colonne générée plutôt qu'un index sur `lower(item)` : l'upsert de
  -- PostgREST ne sait cibler que des colonnes réelles, pas une expression.
  item_key      text generated always as (lower(item)) stored,
  why           text,
  priority      text not null default 'moyenne'
                check (priority in ('haute', 'moyenne', 'basse')),
  occasion      text,

  -- Produits réels issus de la recherche web. `searched_at` distingue « jamais
  -- cherché » (null) de « cherché sans résultat » (liste vide) : sans lui, on
  -- relancerait indéfiniment une recherche qui ne donne rien.
  product_matches jsonb not null default '[]'::jsonb,
  searched_at     timestamptz,

  dismissed_at  timestamptz,
  created_at    timestamptz not null default now()
);

create index shopping_suggestions_user_idx
  on public.shopping_suggestions (user_id, created_at desc);

-- Clé de dédoublonnage : le même manque, formulé pareil, n'apparaît qu'une fois
-- par utilisateur, quel que soit le nombre de scans.
create unique index shopping_suggestions_unique_item
  on public.shopping_suggestions (user_id, item_key);

-- ---------------------------------------------------------------------------
-- RLS : lecture de ses propres suggestions. L'écriture passe par le serveur
-- (insertion après un scan, recherche produit), sauf le rejet d'une suggestion
-- que l'utilisateur doit pouvoir faire lui-même.
-- ---------------------------------------------------------------------------
alter table public.shopping_suggestions enable row level security;

create policy shopping_select_own on public.shopping_suggestions
  for select to authenticated
  using (auth.uid() = user_id);

create policy shopping_update_own on public.shopping_suggestions
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

revoke insert, delete on public.shopping_suggestions from anon, authenticated;
revoke update on public.shopping_suggestions from anon, authenticated;

-- Seule colonne que le client peut écrire : masquer une suggestion. Il ne doit
-- pas pouvoir se fabriquer des liens produits ni modifier ceux qui viennent de
-- la recherche vérifiée.
grant update (dismissed_at) on public.shopping_suggestions to authenticated;

-- ─────────────────────────────────────────────────────────────────────
-- 0008_weather.sql
-- ─────────────────────────────────────────────────────────────────────

-- Vesti — suggestion du jour selon la météo
--
-- Objectif : « il fait 8°C et il pleut, mets ça » — composé avec les pièces que
-- l'utilisateur possède déjà.

alter table public.profiles
  -- Coordonnées volontairement arrondies au centième de degré (~1 km) :
  -- largement assez fin pour la météo, et on évite de stocker la position
  -- précise d'une personne.
  add column latitude  numeric(6, 2) check (latitude between -90 and 90),
  add column longitude numeric(6, 2) check (longitude between -180 and 180),
  add column city      text;

comment on column public.profiles.latitude is
  'Arrondi ~1 km. Sert uniquement à la météo du jour ; jamais à localiser précisément.';

-- L'utilisateur renseigne sa position lui-même (géolocalisation ou ville).
grant update (latitude, longitude, city) on public.profiles to authenticated;

-- ---------------------------------------------------------------------------
-- Suggestion du jour
--
-- Une suggestion coûte un appel au modèle : on n'en produit qu'une par jour et
-- par occasion, et on la relit ensuite. Sans cette contrainte, rafraîchir la
-- page suffirait à multiplier la facture.
-- ---------------------------------------------------------------------------
create table public.daily_suggestions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  day        date not null,
  occasion   text not null,

  weather    jsonb not null,
  outfit     jsonb not null,

  model      text,
  created_at timestamptz not null default now()
);

create unique index daily_suggestions_unique
  on public.daily_suggestions (user_id, day, occasion);

alter table public.daily_suggestions enable row level security;

create policy daily_suggestions_select_own on public.daily_suggestions
  for select to authenticated
  using (auth.uid() = user_id);

-- Écriture réservée au serveur : une suggestion doit venir d'un appel réel au
-- modèle, pas d'une ligne fabriquée côté client.
revoke insert, update, delete on public.daily_suggestions from anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────
-- 0009_harden_functions.sql
-- ─────────────────────────────────────────────────────────────────────

-- Vesti — durcissement des fonctions
--
-- Deux points relevés par le vérificateur de sécurité de Supabase sur la base
-- de production, tous deux réels.

-- ---------------------------------------------------------------------------
-- 1. `handle_new_user` ne doit pas être appelable par l'API REST
--
-- C'est une fonction de DÉCLENCHEUR : elle n'a de sens qu'appelée par Postgres
-- à l'insertion dans `auth.users`. Or, étant dans le schéma `public`, PostgREST
-- l'exposait sur `/rest/v1/rpc/handle_new_user`, appelable même sans être
-- connecté. Elle est SECURITY DEFINER et écrit dans `profiles` : aucune raison
-- de laisser cette porte ouverte.
--
-- Révoquer EXECUTE ne casse pas le déclencheur — Postgres ne vérifie ce
-- privilège qu'à la création du trigger, pas à chaque déclenchement. Vérifié
-- sur une base de test : un INSERT dans `auth.users` crée toujours le profil.
-- ---------------------------------------------------------------------------
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. `search_path` figé sur les trois fonctions pures
--
-- Sans `SET search_path`, la résolution des noms dépend du chemin de l'appelant.
-- `normalize_referral_code` est la plus exposée : elle sert dans une contrainte
-- CHECK et à l'intérieur d'une fonction SECURITY DEFINER, deux endroits où l'on
-- ne veut pas qu'un schéma inséré devant `pg_catalog` change ce que fait
-- `upper()` ou `regexp_replace()`.
--
-- `search_path = ''` suffit : ces fonctions n'appellent que des primitives de
-- `pg_catalog`, toujours résolu implicitement.
-- ---------------------------------------------------------------------------
create or replace function public.plan_analysis_limit(p_plan text)
returns integer
language sql
immutable
set search_path = ''
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
set search_path = ''
as $$
  select p_plan in ('pro', 'styliste');
$$;

create or replace function public.normalize_referral_code(p_code text)
returns text
language sql
immutable
set search_path = ''
as $$
  select upper(regexp_replace(coalesce(p_code, ''), '[^a-zA-Z0-9]', '', 'g'));
$$;

-- ---------------------------------------------------------------------------
-- Ce qui n'est PAS corrigé, et pourquoi
--
-- • `referral_codes` et `stripe_events` ont RLS activé sans aucune policy. Le
--   vérificateur le signale ; c'est voulu. RLS actif + zéro policy = personne
--   ne lit rien depuis le client, ce qui est exactement le but : la liste des
--   codes partenaires et le journal des événements Stripe restent internes.
--
-- • `consume_analysis_quota`, `get_quota_status`, `refund_analysis_quota` et
--   `redeem_referral_code` sont appelables par les utilisateurs connectés en
--   SECURITY DEFINER. C'est tout le principe : ces fonctions existent pour
--   écrire dans des colonnes que le client n'a pas le droit de toucher
--   directement (plan, compteur de quota, code de parrainage). Les passer en
--   SECURITY INVOKER les rendrait inopérantes.
-- ---------------------------------------------------------------------------


-- ─────────────────────────────────────────────────────────────────────
-- 0010_style_tokens.sql
-- ─────────────────────────────────────────────────────────────────────

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


-- ─────────────────────────────────────────────────────────────────────
-- 0011_first_name.sql
-- ─────────────────────────────────────────────────────────────────────

-- Vesti — le prénom
--
-- Demandé dès l'onboarding, avant la morphologie : c'est la question la moins
-- intrusive du formulaire, et commencer par elle rend la suite plus facile à
-- accepter. Il sert à s'adresser à la personne — un verdict qui commence par
-- « Ta tenue » plutôt que « Cette tenue » se lit comme un conseil, pas comme
-- un rapport.
--
-- Facultatif : quelqu'un qui passe l'étape doit pouvoir utiliser l'app.

alter table public.profiles
  add column first_name text check (
    first_name is null or (length(btrim(first_name)) between 1 and 40)
  );

-- ⚠️ Le droit d'écriture doit être accordé EXPLICITEMENT.
--
-- Les permissions d'update sur `profiles` ne sont pas données à la table entière
-- avec des exceptions : c'est une liste blanche, colonne par colonne. Une
-- nouvelle colonne est donc fermée par défaut — bon réglage, mais qui veut dire
-- qu'ajouter un champ d'onboarding sans cette ligne donne un formulaire qui
-- s'affiche, se remplit, et échoue à l'enregistrement. C'est arrivé.
--
-- Contrairement au plan, au quota ou au solde de Style, le prénom appartient à
-- la personne : elle le renseigne et le corrige elle-même.
grant update (first_name) on public.profiles to authenticated;


-- ─────────────────────────────────────────────────────────────────────
-- 0012_fair_use_limits.sql
-- ─────────────────────────────────────────────────────────────────────

-- Vesti — abaisser les plafonds fair use
--
-- Pro passe de 150 à 50 analyses par mois, Styliste de 300 à 100.
--
-- 💰 Le calcul qui commande ces nombres. Une analyse coûte environ 0,06 $,
-- mesuré sur de vraies analyses et non estimé. Aux anciens plafonds, un abonné
-- qui allait au bout coûtait ~9 $ sur un plan à 8,99 € et ~18 $ sur un plan à
-- 17,99 € : la marge était nulle avant même les frais Stripe, et négative sur
-- Styliste où s'ajoutent les recherches de produits.
--
-- 50 analyses par mois, c'est plus d'une tenue et demie par jour, tous les
-- jours. Le plafond reste donc invisible pour un usage normal — ce qui est tout
-- l'intérêt : c'est un garde-fou anti-abus, pas un argument commercial. Ce qu'il
-- empêche, c'est qu'un seul utilisateur intensif efface la marge de plusieurs
-- autres.
--
-- ⚠️ Ces nombres existent en double : ici, et dans `lib/plans.ts` qui les
-- affiche. Le SQL décide, le TypeScript ne fait que raconter. Un test
-- (supabase/tests/01_quota_and_rls.sql) échoue si les deux divergent.

create or replace function public.plan_analysis_limit(p_plan text)
returns integer
language sql
immutable
set search_path = ''
as $$
  select case p_plan
    when 'free'     then 3
    when 'pro'      then 50
    when 'styliste' then 100
    else 0
  end;
$$;


-- ─────────────────────────────────────────────────────────────────────
-- 0013_referral_earnings.sql
-- ─────────────────────────────────────────────────────────────────────

-- Vesti — commissions de parrainage, ligne par ligne
--
-- Le problème que ça règle : la table `subscriptions` dit qui paie MAINTENANT.
-- Quand quelqu'un résilie, la ligne est mise à jour et l'information d'avant
-- disparaît. Impossible de dire « ce filleul a payé quatre mois puis est
-- parti », donc impossible de calculer une commission honnête.
--
-- 💰 Une ligne par encaissement réel, avec le montant que Stripe a
-- effectivement collecté. Jamais un prix affiché multiplié à la main : un prix
-- catalogue ignore les remises, les mois partiels, les impayés et les
-- remboursements. Pour payer quelqu'un au centime, la seule source acceptable
-- est la facture.

create table public.referral_earnings (
  id              uuid primary key default gen_random_uuid(),

  -- Qui touche la commission, et pour qui.
  referrer_id     uuid not null references public.profiles (id) on delete cascade,
  referred_id     uuid not null references public.profiles (id) on delete cascade,

  -- Identifiant Stripe de l'événement d'argent : facture encaissée, ou
  -- remboursement. UNIQUE, parce que Stripe rejoue ses webhooks — sans cette
  -- contrainte, une livraison répétée paierait deux fois la même commission.
  stripe_id       text not null unique,
  kind            text not null check (kind in ('invoice', 'refund')),

  -- Montants en CENTIMES, en entiers. Un flottant sur de l'argent finit par
  -- produire des centimes fantômes à la sommation ; ici tout est exact.
  -- Négatifs pour un remboursement.
  gross_cents     integer not null,
  commission_cents integer not null,

  -- Le taux est figé sur la ligne, pas lu dans une constante. Le jour où il
  -- passe de 30 % à 25 %, les commissions déjà dues doivent rester calculées
  -- au taux promis à l'époque.
  rate            numeric(5,4) not null check (rate >= 0 and rate <= 1),

  currency        text not null default 'eur',
  occurred_at     timestamptz not null,
  created_at      timestamptz not null default now()
);

create index referral_earnings_referrer_idx
  on public.referral_earnings (referrer_id, occurred_at desc);

alter table public.referral_earnings enable row level security;

-- On voit ce qu'on a gagné, et rien d'autre : ni les lignes des autres, ni
-- l'identité de ses filleuls au-delà de ce que l'application choisit d'exposer.
create policy referral_earnings_select_own on public.referral_earnings
  for select to authenticated
  using (auth.uid() = referrer_id);

-- Écriture réservée au serveur : ces lignes sont de l'argent dû.
revoke insert, update, delete on public.referral_earnings from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Taux en vigueur, en un seul endroit
-- ---------------------------------------------------------------------------
create or replace function public.referral_commission_rate()
returns numeric language sql immutable set search_path = '' as $$ select 0.30 $$;

-- ---------------------------------------------------------------------------
-- Ce qu'un parrain a gagné
--
-- Trois nombres différents, et les confondre serait une faute :
--  - `total` : tout ce qui a été gagné depuis le début, remboursements déduits ;
--  - `pending` : ce qui n'a pas encore été versé ;
--  - `paid_out` : ce qui a déjà été versé.
--
-- La colonne de versement n'existe pas encore — les paiements se feront à la
-- main au début. `paid_out` reste donc à zéro, mais la forme est posée pour ne
-- pas avoir à réécrire l'affichage le jour où elle arrivera.
-- ---------------------------------------------------------------------------
create or replace function public.referral_earnings_summary()
returns table (
  total_cents      bigint,
  referred_paying  integer,
  invoices         integer
)
language sql
stable
security definer
set search_path = public
as $$
  select
    coalesce(sum(e.commission_cents), 0)::bigint,
    count(distinct e.referred_id) filter (where e.kind = 'invoice')::integer,
    count(*) filter (where e.kind = 'invoice')::integer
  from public.referral_earnings e
  where e.referrer_id = auth.uid();
$$;

revoke execute on function public.referral_earnings_summary() from public, anon;
grant execute on function public.referral_earnings_summary() to authenticated;


-- ───────────────────────────────────────────────────────────────
-- 0014_cost_tracking.sql
-- ───────────────────────────────────────────────────────────────

-- Vesti — mesurer le coût réel, et fermer le dernier scénario perdant
--
-- Deux choses, liées par le même but : ne jamais servir un client à perte.

-- ---------------------------------------------------------------------------
-- 1. Le coût de chaque analyse, en micro-dollars
--
-- Les tokens étaient déjà enregistrés, mais il fallait ressortir les tarifs à
-- la main pour en tirer un coût. Le stocker le rend interrogeable : marge par
-- client, par plan, par mois, sans refaire un calcul de tête à chaque question.
--
-- En micro-dollars entiers (millionièmes) : une analyse coûte quelques
-- centimes, arrondir au centime effacerait la différence entre deux réglages
-- qu'on cherche justement à comparer.
-- ---------------------------------------------------------------------------
alter table public.analyses
  add column cost_micros integer not null default 0
    check (cost_micros >= 0);

comment on column public.analyses.cost_micros is
  'Coût du modèle en micro-dollars. 0 = non mesuré (réponse d''API incomplète), pas gratuit.';

-- ---------------------------------------------------------------------------
-- 2. Plafonds fair use : Pro 50 → 40, Styliste 100 → 60
--
-- 💰 Le calcul du pire cas, sur un client amené par un influenceur à 30 % :
--
--   Pro       8,99 € − 2,70 (commission) − 0,38 (Stripe) = 5,91 € restants.
--             40 analyses × ~0,06 $ ≈ 2,40 → il reste ~3,50 €.
--
--   Styliste 17,99 € − 5,40 (commission) − 0,52 (Stripe) = 12,07 € restants.
--             60 analyses × ~0,10 $ ≈ 6,00 → il reste ~6,00 €.
--
-- Aux anciens plafonds, un abonné Styliste qui allait au bout coûtait environ
-- 10 € pour 12,07 € restants : la marge tenait à 2 €, sur une estimation. Le
-- même client atteignant 100 analyses AVEC les recherches de produits pouvait
-- passer en négatif. C'est ce scénario-là qui est fermé.
--
-- 40 analyses par mois, c'est plus d'une tenue par jour tous les jours : le
-- plafond reste invisible pour un usage normal.
--
-- ⚠️ Miroir de `lib/plans.ts`. Un test SQL échoue si les deux divergent.
-- ---------------------------------------------------------------------------
create or replace function public.plan_analysis_limit(p_plan text)
returns integer
language sql
immutable
set search_path = ''
as $$
  select case p_plan
    when 'free'     then 3
    when 'pro'      then 40
    when 'styliste' then 60
    else 0
  end;
$$;


-- ---------------------------------------------------------------------------
-- 3. Rattraper l'historique
--
-- Les analyses déjà faites ont leurs tokens : leur coût est calculable, il
-- serait dommage de démarrer la mesure à zéro alors que la réponse existe
-- déjà. Le `cost_micros = 0` en condition rend le rattrapage rejouable sans
-- écraser une valeur déjà écrite par l'application.
--
-- 📏 Ce que ça a donné sur les 11 premières analyses : 0,059 $ en moyenne,
-- 0,0715 $ au pire. C'est la mesure qui remplace l'estimation « ~0,06 $ » sur
-- laquelle les plafonds ci-dessus ont été calculés — elle la confirme.
-- ---------------------------------------------------------------------------
update public.analyses
set cost_micros = round(input_tokens * 5 + output_tokens * 25)
where model = 'claude-opus-5'
  and input_tokens is not null
  and output_tokens is not null
  and cost_micros = 0;


-- ─────────────────────────────────────────────────────────────────────
-- 0015_vat_ready.sql
-- ─────────────────────────────────────────────────────────────────────

-- Vesti — préparer la TVA sans encore l'appliquer
--
-- Aujourd'hui Vesti relève de la franchise en base (art. 293 B du CGI) : aucune
-- TVA n'est facturée ni collectée. Ce sera vrai jusqu'au franchissement du
-- seuil, qui s'apprécie sur l'ENSEMBLE du chiffre d'affaires de la structure —
-- pas sur celui de Vesti seul.
--
-- ⚠️ Le registre des commissions ne gardait qu'un montant : l'encaissé. Le jour
-- de la bascule, ce montant cesserait de vouloir dire « ce qui nous revient »
-- sans que rien dans le schéma ne le signale, et les lignes d'avant et d'après
-- deviendraient incomparables sans qu'on puisse le savoir en les lisant.
--
-- On sépare donc les trois montants dès maintenant, tant que c'est gratuit :
--
--   gross_cents  ce que Stripe a encaissé  → rapprochement bancaire
--   net_cents    ce qui nous revient       → base de la commission
--   vat_cents    ce qui est dû à l'État    → déclaration
--
-- Tant que la franchise s'applique : net = brut, TVA = 0. Les lignes déjà
-- écrites restent donc exactes, et les futures le resteront après la bascule.

alter table public.referral_earnings
  add column net_cents integer,
  add column vat_cents integer not null default 0;

-- Les lignes existantes ont été encaissées sous franchise : le net EST le brut.
-- Ce n'est pas une approximation de rattrapage, c'est le montant exact.
update public.referral_earnings set net_cents = gross_cents where net_cents is null;

alter table public.referral_earnings
  alter column net_cents set not null;

-- Invariants : la TVA ne peut pas dépasser l'encaissement, et les deux parts
-- doivent le recomposer exactement. Une commission calculée sur une ligne qui
-- viole ça serait fausse — autant que la base refuse de l'écrire.
alter table public.referral_earnings
  add constraint referral_earnings_net_recompose
    check (net_cents + vat_cents = gross_cents),
  add constraint referral_earnings_net_same_sign
    check (abs(net_cents) <= abs(gross_cents));

comment on column public.referral_earnings.net_cents is
  'Encaissé hors TVA. Base de calcul de la commission. Sous franchise, égal à gross_cents.';
comment on column public.referral_earnings.vat_cents is
  'TVA collectée, due à l''État. Ne fait jamais partie de la base de commission.';


-- ─────────────────────────────────────────────────────────────────────
-- 0016_deferred_product_search.sql
-- ─────────────────────────────────────────────────────────────────────

-- Vesti — sortir la recherche de produits du chemin critique
--
-- ⚠️ Le défaut corrigé : la recherche de produits bloquait le verdict.
--
-- Sur le plan Styliste, l'analyse enchaînait jusqu'à trois recherches web
-- (chacune un appel au modèle, chacune suivie d'une lecture de page pour en
-- tirer la photo du produit) AVANT de répondre quoi que ce soit. Le verdict
-- était prêt depuis longtemps ; le client regardait tourner un écran d'attente
-- pendant qu'on cherchait des liens qu'il n'avait pas encore demandés.
--
-- Deux conséquences, et la seconde est la pire :
--   1. l'abonné qui paie le plus cher attendait le plus longtemps ;
--   2. la requête restait ouverte deux fois plus longtemps, donc avait deux
--      fois plus d'occasions de tomber sur un réseau mobile — et une requête
--      tombée, c'est un verdict perdu.
--
-- Désormais le verdict part dès qu'il est prêt, et les liens sont cherchés
-- dans un second appel. Pour que ce second appel n'ait besoin de RIEN venant
-- du navigateur, il faut que le serveur retrouve seul de quoi chercher : d'où
-- cette colonne.

-- Mots-clés d'achat produits par le modèle à l'analyse ("jean droit brut taille
-- haute"). Ils étaient calculés puis jetés ; sans eux, une recherche différée
-- devrait se rabattre sur le libellé seul, et perdrait en précision — ou pire,
-- devrait faire confiance à une requête envoyée par le navigateur.
alter table public.dressing_items
  add column search_terms text[] not null default '{}';

comment on column public.dressing_items.search_terms is
  'Mots-clés d''achat issus de l''analyse. Servent à la recherche produits différée, côté serveur uniquement.';

-- 🔒 Aucun GRANT ici, volontairement, et ce n'est pas un oubli.
--
-- `authenticated` ne possède que SELECT sur cette table : ni INSERT ni UPDATE.
-- Toutes les écritures passent déjà par le client admin, côté serveur. La
-- nouvelle colonne hérite donc de cet état fermé sans qu'on ait rien à faire.
--
-- C'est exactement ce qu'il faut pour celle-ci : `search_terms` décide du
-- contenu d'une recherche web facturée à l'usage. La rendre écrivable
-- laisserait n'importe qui piloter — et payer avec notre compte — des
-- recherches arbitraires. Vérifié avant d'écrire cette migration : ajouter un
-- GRANT « pour être sûr » aurait ouvert un droit qui n'existait pas.


-- ─────────────────────────────────────────────────────────────────────
-- 0017_quota_from_delivered.sql
-- ─────────────────────────────────────────────────────────────────────

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


-- ─────────────────────────────────────────────────────────────────────
-- 0018_partner_only_commission.sql
-- ─────────────────────────────────────────────────────────────────────

-- Vesti — la commission de 30 % n'est due qu'aux partenaires
--
-- ⚠️ Le défaut corrigé : le registre créditait 30 % à N'IMPORTE QUEL parrain.
--
-- `recordReferralEarning` écrivait une commission dès qu'un filleul avait un
-- parrain, sans distinguer un influenceur avec qui un accord existe d'un client
-- qui a simplement partagé son code à un ami. Or les 30 % sont une contrepartie
-- négociée avec des partenaires ; le programme de parrainage grand public, lui,
-- récompense en Style — des mois offerts, qui ne coûtent pas de trésorerie.
--
-- Tant qu'aucun client ne paie, la différence est invisible. Au premier abonné
-- elle devient une dette : des lignes comptables donnant raison à des gens à
-- qui rien n'a jamais été promis. Un registre d'argent dû ne se corrige pas
-- après coup sans casser la confiance — donc on le règle avant.

-- ---------------------------------------------------------------------------
-- Qui est partenaire
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column is_partner boolean not null default false;

comment on column public.profiles.is_partner is
  'Partenaire rémunéré à la commission (influenceur). Faux par défaut : la commission se mérite par un accord, pas par un parrainage.';

-- 🔒 Aucun GRANT. Cette colonne décide de qui touche de l'argent : elle se pose
-- côté serveur, jamais depuis le navigateur. Le test de permissions vérifie
-- qu'elle reste hors de portée du client.

create index profiles_partner_idx on public.profiles (is_partner) where is_partner;

-- ---------------------------------------------------------------------------
-- À qui revient la commission pour un client Stripe donné
--
-- Cette fonction porte la règle, plutôt que de la laisser dans le TypeScript
-- du webhook. Deux raisons :
--   • elle devient vérifiable par un test SQL, sans simuler Stripe ;
--   • la règle vit à côté des données qu'elle protège, donc un second appelant
--     ne peut pas l'oublier.
--
-- Renvoie zéro ligne quand il n'y a rien à payer — client inconnu, pas de
-- parrain, ou parrain non partenaire. C'est le cas NORMAL, pas une erreur :
-- l'immense majorité des clients n'a pas de parrain.
-- ---------------------------------------------------------------------------
create or replace function public.commission_recipient(p_customer text)
returns table (referred_id uuid, referrer_id uuid)
language sql
stable
security definer
set search_path = public
as $$
  select filleul.id, parrain.id
  from public.profiles filleul
  join public.profiles parrain on parrain.id = filleul.referred_by
  where filleul.stripe_customer_id = p_customer
    and parrain.is_partner;
$$;

-- Appelée par le webhook Stripe avec la clé de service, qui ignore ces droits.
-- Personne d'autre n'a à savoir qui est partenaire.
revoke execute on function public.commission_recipient(text)
  from public, anon, authenticated;


-- ─────────────────────────────────────────────────────────────────────
-- 0019_add_analysis_cost.sql
-- ─────────────────────────────────────────────────────────────────────

-- Vesti — additionner le coût des recherches à celui du verdict
--
-- ⚠️ Ce qui a rendu cette migration nécessaire : `analyses.cost_micros` ne
-- mesurait QUE l'appel du verdict. Les recherches produits — jusqu'à trois par
-- analyse sur le plan Styliste, chacune ramenant des pages web entières dans
-- le contexte ET facturée à l'acte — n'étaient comptées nulle part.
--
-- Résultat : la colonne annonçait 0,034 $ pour une analyse qui en coûtait plus
-- de dix fois autant. Toutes les marges calculées à partir de ce chiffre
-- étaient fausses, et fausses dans le sens rassurant.
--
-- 🔍 Une mesure partielle est plus dangereuse qu'une absence de mesure : on
-- lui fait confiance. « Non mesuré » se remarque ; « mesuré à un dixième » se
-- cite dans un tableau de marge.
--
-- L'addition se fait en SQL plutôt qu'en lisant-modifiant-écrivant depuis le
-- serveur : les recherches partent en parallèle, et deux écritures simultanées
-- perdraient l'une des deux.

create or replace function public.add_analysis_cost(p_analysis uuid, p_micros integer)
returns void
language sql
security definer
set search_path = public
as $$
  update public.analyses
     set cost_micros = cost_micros + greatest(p_micros, 0)
   where id = p_analysis;
$$;

comment on function public.add_analysis_cost(uuid, integer) is
  'Ajoute un coût à une analyse déjà enregistrée (recherches produits). Incrémental : sûr face aux appels concurrents.';

-- Appelée par le serveur avec la clé de service, qui ignore ces droits.
-- Personne d'autre n'a à pouvoir gonfler le coût d'une analyse.
revoke execute on function public.add_analysis_cost(uuid, integer)
  from public, anon, authenticated;
