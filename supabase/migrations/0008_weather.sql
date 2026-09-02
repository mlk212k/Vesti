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
