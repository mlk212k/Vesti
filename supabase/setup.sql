-- =====================================================================
-- Vesti — installation complète de la base, en un seul fichier
-- =====================================================================
--
-- Les 8 migrations de `supabase/migrations/` mises bout à bout, dans
-- l'ordre, pour n'avoir qu'un seul copier-coller à faire dans le
-- SQL Editor de Supabase lors de la première installation.
--
-- Les fichiers numérotés restent la référence : toute modification
-- ultérieure se fait là-bas, dans une NOUVELLE migration. Ce fichier
-- ne sert qu'au démarrage d'un projet vide.
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
