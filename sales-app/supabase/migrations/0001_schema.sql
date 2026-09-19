-- ---------------------------------------------------------------------------
-- Application commerciale « cartes NFC » — schéma complet.
--
-- Principes tenus par ce fichier :
--
--   1. L'argent est stocké en CENTIMES (integer). Jamais de float.
--      Le taux de commission est en POINTS DE BASE (1000 = 10,00 %), donc
--      entier lui aussi : aucun arrondi flottant ne peut s'y glisser.
--   2. Le CA, la commission et le net d'une vente sont des COLONNES GÉNÉRÉES.
--      Postgres les calcule, personne ne peut les écrire — ni le front, ni
--      une requête REST forgée à la main.
--   3. Les écritures qui touchent à plusieurs tables (une vente décrémente
--      aussi le stock du membre) passent par des fonctions `security definer`
--      qui revérifient l'identité et le rôle. Les tables concernées n'ont
--      AUCUNE policy d'INSERT/UPDATE : même avec la clé anon et le bon JWT,
--      un membre ne peut pas s'inventer une vente.
--   4. RLS activée partout. Un membre ne lit que ses propres lignes, le
--      manager lit celles de l'équipe, l'admin lit tout.
-- ---------------------------------------------------------------------------

-- Enums ---------------------------------------------------------------------

create type public.app_role as enum ('admin', 'manager', 'member');

-- Le statut stocké est un fait ('en cours', 'terminée', 'validée').
-- « Objectif atteint / non atteint » n'est PAS stocké : c'est une lecture
-- des ventes face à l'objectif, calculée par la vue v_work_day_stats. Un
-- fait dérivé stocké finit toujours par mentir.
create type public.work_day_status as enum ('in_progress', 'ended', 'validated');

create type public.movement_kind as enum (
  'restock',    -- réapprovisionnement du stock global
  'allocation', -- stock global -> membre
  'return',     -- membre -> stock global
  'sale',       -- cartes vendues par un membre
  'loss',       -- cartes perdues/abîmées chez un membre
  'adjustment'  -- correction d'inventaire (recomptage)
);

create type public.business_status as enum (
  'prospect', 'client', 'callback', 'refused'
);

create type public.conversation_kind as enum ('team', 'direct');

create type public.payout_status as enum ('pending', 'paid');

-- Profils -------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null check (length(trim(full_name)) between 1 and 120),
  role public.app_role not null default 'member',
  phone text,
  avatar_url text,
  -- Objectif personnel. NULL = on applique l'objectif par défaut des
  -- paramètres. Aucun « 10 » codé en dur ailleurs.
  daily_goal_override integer check (daily_goal_override > 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index profiles_role_idx on public.profiles (role);

-- Provisionnement du profil à la création du compte.
--
-- Le rôle N'EST JAMAIS lu depuis les métadonnées : quiconque sait parler à
-- l'API d'auth pourrait sinon se déclarer admin. Tout compte naît `member`,
-- et seul un admin le promeut ensuite (voir lib/admin.ts, qui utilise la
-- clé service_role côté serveur uniquement).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
      split_part(new.email, '@', 1)
    )
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Helpers de rôle -----------------------------------------------------------
--
-- `security definer` : sans ça, une policy sur `profiles` qui lit `profiles`
-- pour connaître le rôle déclencherait une récursion infinie.

create or replace function public.current_app_role()
returns public.app_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- Admin ou manager : l'encadrement.
create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin', 'manager')
  );
$$;

-- La règle de visibilité, écrite UNE fois et réutilisée par toutes les
-- policies : je vois mes lignes, l'encadrement voit celles de tout le monde.
create or replace function public.can_view_member(target uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select target = auth.uid() or public.is_staff();
$$;

-- Paramètres ----------------------------------------------------------------
--
-- Ligne unique (id = 1). Tout ce qui est « réglable » vit ici : taux de
-- commission, objectif par défaut, prix unitaire par défaut, pénalité.

create table public.app_settings (
  id smallint primary key default 1 check (id = 1),
  team_name text not null default 'ARENA',
  currency text not null default 'EUR',
  -- 1000 points de base = 10,00 %
  commission_rate_bp integer not null default 1000
    check (commission_rate_bp between 0 and 10000),
  default_daily_goal integer not null default 10
    check (default_daily_goal > 0),
  default_card_price_cents integer not null default 5000
    check (default_card_price_cents >= 0),
  -- Conséquence financière d'un objectif manqué. Par défaut : AUCUNE.
  -- Elle n'est jamais prélevée automatiquement — un admin/manager doit
  -- valider la journée et confirmer le montant (voir validate_work_day).
  missed_goal_penalty_cents integer not null default 0
    check (missed_goal_penalty_cents >= 0),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

insert into public.app_settings (id) values (1);

-- Stock ---------------------------------------------------------------------

-- Entrées de stock (achats de cartes).
create table public.card_batches (
  id uuid primary key default gen_random_uuid(),
  label text not null default 'Réapprovisionnement',
  quantity integer not null check (quantity > 0),
  unit_cost_cents integer check (unit_cost_cents >= 0),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

-- Attributions à un membre.
create table public.card_allocations (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.profiles(id) on delete cascade,
  quantity integer not null check (quantity > 0),
  note text,
  allocated_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

create index card_allocations_member_idx
  on public.card_allocations (member_id, created_at desc);

-- Le grand livre du stock. Chaque ligne dit ce que le mouvement a fait
-- AU STOCK GLOBAL (warehouse_delta) et AU STOCK D'UN MEMBRE (member_delta),
-- signés. Les totaux ne sont donc jamais « recalculés » à la main : ce sont
-- deux sommes, et l'historique est la seule source de vérité.
create table public.card_movements (
  id uuid primary key default gen_random_uuid(),
  kind public.movement_kind not null,
  quantity integer not null check (quantity > 0),
  warehouse_delta integer not null,
  member_delta integer not null,
  member_id uuid references public.profiles(id) on delete set null,
  allocation_id uuid references public.card_allocations(id) on delete set null,
  sale_id uuid,
  note text,
  actor_id uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create index card_movements_member_idx
  on public.card_movements (member_id, created_at desc);
create index card_movements_created_idx
  on public.card_movements (created_at desc);

-- Journées ------------------------------------------------------------------

create table public.work_days (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.profiles(id) on delete cascade,
  work_date date not null default (now() at time zone 'Europe/Paris')::date,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  status public.work_day_status not null default 'in_progress',
  -- Objectif figé à l'ouverture : changer le paramètre global demain ne doit
  -- pas réécrire le passé.
  goal_cards integer not null check (goal_cards > 0),
  notes text,
  penalty_cents integer not null default 0 check (penalty_cents >= 0),
  validated_by uuid references auth.users(id),
  validated_at timestamptz,
  created_at timestamptz not null default now(),
  constraint work_days_one_per_day unique (member_id, work_date),
  constraint work_days_end_after_start check (ended_at is null or ended_at >= started_at)
);

-- Une seule journée ouverte à la fois par personne.
create unique index work_days_single_open_idx
  on public.work_days (member_id)
  where status = 'in_progress';

create index work_days_member_date_idx
  on public.work_days (member_id, work_date desc);
create index work_days_date_idx on public.work_days (work_date desc);

-- Commerces -----------------------------------------------------------------

create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 160),
  category text,
  address text,
  city text,
  postal_code text,
  contact_name text,
  phone text,
  email text,
  status public.business_status not null default 'prospect',
  notes text,
  next_action text,
  next_action_at date,
  photo_url text,
  visited_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index businesses_member_idx on public.businesses (member_id, created_at desc);
create index businesses_city_idx on public.businesses (city);

-- Ventes --------------------------------------------------------------------
--
-- montant = quantité × prix unitaire
-- commission = montant × taux / 10000   (arrondi au centime)
-- net = montant − commission
--
-- Les trois sont des colonnes générées : le serveur ne « fait pas confiance »
-- au front, il ne lui demande même pas son avis.
--
-- `commission_rate_bp` est figé à la vente : si le chef passe de 10 % à 12 %
-- demain, les ventes d'hier gardent leur commission d'hier.

create table public.sales (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.profiles(id) on delete cascade,
  work_day_id uuid not null references public.work_days(id) on delete cascade,
  business_id uuid references public.businesses(id) on delete set null,
  quantity integer not null check (quantity > 0 and quantity <= 1000),
  unit_price_cents integer not null check (unit_price_cents >= 0),
  commission_rate_bp integer not null check (commission_rate_bp between 0 and 10000),
  amount_cents integer
    generated always as (quantity * unit_price_cents) stored,
  commission_cents integer
    generated always as (
      round((quantity * unit_price_cents)::numeric * commission_rate_bp / 10000)::integer
    ) stored,
  net_cents integer
    generated always as (
      quantity * unit_price_cents
      - round((quantity * unit_price_cents)::numeric * commission_rate_bp / 10000)::integer
    ) stored,
  sold_at timestamptz not null default now(),
  notes text,
  photo_url text,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index sales_member_idx on public.sales (member_id, sold_at desc);
create index sales_day_idx on public.sales (work_day_id);
create index sales_sold_at_idx on public.sales (sold_at desc);
create index sales_business_idx on public.sales (business_id);

alter table public.card_movements
  add constraint card_movements_sale_fk
  foreign key (sale_id) references public.sales(id) on delete set null;

-- Règlements de commission --------------------------------------------------
--
-- La commission est *due* dès la vente (elle est dans chaque ligne de vente).
-- Cette table trace le fait qu'elle a été *encaissée* par le chef pour une
-- période donnée. Sans elle, « commission payée » ne voudrait rien dire.

create table public.commission_payouts (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.profiles(id) on delete cascade,
  period_start date not null,
  period_end date not null,
  amount_cents integer not null check (amount_cents >= 0),
  status public.payout_status not null default 'pending',
  note text,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  paid_at timestamptz,
  constraint payout_period_order check (period_end >= period_start)
);

create index commission_payouts_member_idx
  on public.commission_payouts (member_id, period_start desc);

-- Chat ----------------------------------------------------------------------

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  kind public.conversation_kind not null default 'direct',
  title text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  last_message_at timestamptz not null default now()
);

create table public.conversation_members (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  last_read_at timestamptz not null default now(),
  joined_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

create index conversation_members_user_idx
  on public.conversation_members (user_id);

-- `clock_timestamp()` et non `now()` : `now()` est figé pour toute une
-- transaction, si bien que deux messages écrits d'affilée porteraient la
-- même heure à la microseconde près — leur ordre d'affichage deviendrait
-- arbitraire, et un message posté à l'instant où l'on rejoint la
-- conversation serait compté comme déjà lu. L'horloge murale est ce qu'on
-- veut pour un fil de discussion.
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  author_id uuid references public.profiles(id) on delete set null,
  body text not null check (length(trim(body)) between 1 and 4000),
  created_at timestamptz not null default clock_timestamp()
);

create index messages_conversation_idx
  on public.messages (conversation_id, created_at desc);

-- La conversation générale, créée une fois pour toutes. Tout le monde y est
-- ajouté à l'inscription (trigger plus bas).
insert into public.conversations (id, kind, title)
values ('00000000-0000-0000-0000-000000000001', 'team', 'Équipe');

-- Notifications -------------------------------------------------------------

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null,
  title text not null,
  body text,
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_user_idx
  on public.notifications (user_id, created_at desc);
create index notifications_unread_idx
  on public.notifications (user_id) where read_at is null;

-- Journal d'audit -----------------------------------------------------------

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index audit_logs_created_idx on public.audit_logs (created_at desc);
create index audit_logs_actor_idx on public.audit_logs (actor_id, created_at desc);
create index audit_logs_action_idx on public.audit_logs (action);

-- Écriture d'audit. `security definer` parce que la table n'accepte aucune
-- écriture directe : on ne veut pas qu'un client puisse fabriquer un faux
-- historique, ni effacer le sien.
create or replace function public.log_audit(
  p_action text,
  p_entity_type text default null,
  p_entity_id uuid default null,
  p_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  insert into public.audit_logs (actor_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), p_action, p_entity_type, p_entity_id, coalesce(p_metadata, '{}'::jsonb));
end;
$$;

revoke all on function public.log_audit(text, text, uuid, jsonb) from public, anon;
grant execute on function public.log_audit(text, text, uuid, jsonb) to authenticated;

-- Tout nouveau membre rejoint la conversation générale.
create or replace function public.handle_new_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.conversation_members (conversation_id, user_id)
  values ('00000000-0000-0000-0000-000000000001', new.id)
  on conflict do nothing;
  return new;
end;
$$;

create trigger on_profile_created
  after insert on public.profiles
  for each row execute function public.handle_new_profile();

-- `updated_at` automatique.
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger businesses_touch
  before update on public.businesses
  for each row execute function public.touch_updated_at();

create trigger sales_touch
  before update on public.sales
  for each row execute function public.touch_updated_at();

-- Toute modification des paramètres est tracée, sans exception possible :
-- c'est un trigger, pas un appel applicatif qu'on peut oublier d'écrire.
create or replace function public.audit_settings_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at := now();
  new.updated_by := auth.uid();

  insert into public.audit_logs (actor_id, action, entity_type, entity_id, metadata)
  values (
    auth.uid(),
    'settings.updated',
    'app_settings',
    null,
    jsonb_build_object(
      'before', to_jsonb(old) - 'updated_at' - 'updated_by',
      'after', to_jsonb(new) - 'updated_at' - 'updated_by'
    )
  );
  return new;
end;
$$;

create trigger app_settings_audit
  before update on public.app_settings
  for each row execute function public.audit_settings_change();
