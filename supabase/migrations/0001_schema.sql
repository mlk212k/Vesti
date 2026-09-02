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
