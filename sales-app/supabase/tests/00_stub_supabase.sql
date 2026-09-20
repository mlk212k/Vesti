-- ---------------------------------------------------------------------------
-- Reproduction minimale de ce que Supabase fournit d'office, pour pouvoir
-- rejouer les migrations sur un Postgres nu (tests, CI, poste local).
--
-- Ce fichier N'EST PAS une migration : il n'est jamais appliqué au projet
-- Supabase, qui a déjà tout ça. Il sert uniquement à `supabase/tests/`.
-- ---------------------------------------------------------------------------

-- Rôles ---------------------------------------------------------------------

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin noinherit bypassrls;
  end if;
end;
$$;

grant usage on schema public to anon, authenticated, service_role;

-- Supabase accorde par défaut les droits de table aux rôles publics ; c'est
-- la RLS qui filtre ensuite. On reproduit ce réglage, sinon les tests
-- passeraient « grâce » à une absence de GRANT plutôt que grâce aux policies.
alter default privileges in schema public
  grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public
  grant all on functions to anon, authenticated, service_role;
alter default privileges in schema public
  grant all on sequences to anon, authenticated, service_role;

-- Schéma auth ---------------------------------------------------------------

create schema if not exists auth;

create table if not exists auth.users (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  raw_user_meta_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Même implémentation que chez Supabase : l'identité vient de la
-- revendication `sub` du JWT, posée sur la session par PostgREST.
create or replace function auth.uid()
returns uuid
language sql
stable
as $$
  select nullif(
    coalesce(
      current_setting('request.jwt.claim.sub', true),
      (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
    ),
    ''
  )::uuid;
$$;

grant usage on schema auth to anon, authenticated, service_role;
grant select on auth.users to authenticated, service_role;

-- Schéma storage ------------------------------------------------------------

create schema if not exists storage;

create table if not exists storage.buckets (
  id text primary key,
  name text not null,
  public boolean not null default false,
  file_size_limit bigint,
  allowed_mime_types text[]
);

create table if not exists storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text references storage.buckets(id),
  name text not null,
  owner uuid,
  created_at timestamptz not null default now()
);

alter table storage.objects enable row level security;

create or replace function storage.foldername(name text)
returns text[]
language sql
immutable
as $$
  select string_to_array(name, '/');
$$;

grant usage on schema storage to anon, authenticated, service_role;
grant all on storage.objects to authenticated, service_role;

-- Schémas pg_net et Vault ---------------------------------------------------
--
-- Supabase installe `pg_net` dans le schéma `extensions` et fournit
-- `vault.decrypted_secrets`. Le binaire pg_net n'est pas dans les paquets
-- Postgres standard, donc on ne peut pas rejouer `create extension pg_net`
-- ici : test-db.sh commente la ligne à la volée, et on remplace les objets
-- réellement utilisés par des équivalents inertes.

create schema if not exists extensions;
create schema if not exists net;
create schema if not exists vault;

grant usage on schema extensions, net, vault to anon, authenticated, service_role;

-- Signature de `pg_net.net.http_post`. La fonction ne fait rien : le trigger
-- de 0009 s'arrête avant l'appel quand les secrets Vault sont absents, ce
-- qui est toujours le cas en test. Elle existe uniquement pour que la
-- fonction PL/pgSQL qui la référence puisse être créée.
create or replace function net.http_post(
  url text,
  body jsonb default '{}'::jsonb,
  params jsonb default '{}'::jsonb,
  headers jsonb default '{}'::jsonb,
  timeout_milliseconds integer default 5000
) returns bigint
language sql
as $$
  select 0::bigint;
$$;

-- `vault.decrypted_secrets` est une vue chez Supabase, filtrée par le rôle.
-- Ici, une table vide suffit : le trigger la lit et n'y trouve rien, donc
-- retourne sans appeler http_post.
create table if not exists vault.decrypted_secrets (
  name text primary key,
  decrypted_secret text
);

-- Publication temps réel ----------------------------------------------------

do $$
begin
  if not exists (
    select 1 from pg_publication where pubname = 'supabase_realtime'
  ) then
    create publication supabase_realtime;
  end if;
end;
$$;

-- pg_net et le Vault ---------------------------------------------------------
--
-- La migration 0009 branche l'envoi des notifications push sur `net.http_post`,
-- et la 0010 lit les secrets dans `vault.decrypted_secrets`. Ni l'un ni
-- l'autre n'existe sur un Postgres nu.
--
-- On les simule plutôt que de rendre les migrations conditionnelles : les
-- tests doivent rejouer EXACTEMENT le schéma de production, sans branche
-- « si l'extension est là ». La version simulée de `http_post` ne part sur
-- aucun réseau — elle se contente d'exister, ce qui suffit à vérifier que le
-- trigger ne bloque pas l'insertion d'une notification.

create schema if not exists net;

create or replace function net.http_post(
  url text,
  body jsonb default '{}'::jsonb,
  params jsonb default '{}'::jsonb,
  headers jsonb default '{}'::jsonb,
  timeout_milliseconds integer default 5000
)
returns bigint
language sql
as $$
  select 1::bigint;
$$;

create schema if not exists vault;

create table if not exists vault.decrypted_secrets (
  id uuid primary key default gen_random_uuid(),
  name text unique,
  description text,
  decrypted_secret text
);
