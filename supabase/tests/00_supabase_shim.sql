-- Reproduit localement ce que Supabase fournit déjà (rôles, schéma auth,
-- auth.uid(), privilèges par défaut du schéma public) afin de pouvoir tester
-- les migrations sur un Postgres nu. Ce fichier n'est PAS une migration : il ne
-- doit jamais être appliqué sur l'instance Supabase.

create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin bypassrls;
  end if;
end
$$;

grant anon, authenticated, service_role to postgres;

create schema if not exists auth;
grant usage on schema auth to anon, authenticated, service_role;

create table if not exists auth.users (
  id         uuid primary key default gen_random_uuid(),
  email      text,
  created_at timestamptz not null default now()
);

-- Même contrat que Supabase : l'id utilisateur vient du claim JWT `sub`.
create or replace function auth.uid()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;

-- Schéma storage minimal : juste ce dont les migrations ont besoin pour
-- s'appliquer et pour tester les policies de cloisonnement par dossier.
create schema if not exists storage;
grant usage on schema storage to anon, authenticated, service_role;

create table if not exists storage.buckets (
  id                 text primary key,
  name               text not null,
  public             boolean not null default false,
  file_size_limit    bigint,
  allowed_mime_types text[],
  created_at         timestamptz not null default now()
);

create table if not exists storage.objects (
  id         uuid primary key default gen_random_uuid(),
  bucket_id  text references storage.buckets (id),
  name       text not null,
  owner      uuid,
  created_at timestamptz not null default now()
);

alter table storage.objects enable row level security;

-- Comme sur Supabase : les privilèges de table sont ouverts, c'est la RLS qui
-- décide réellement. Sans ces GRANT, les policies de 0004 ne seraient jamais
-- évaluées et les tests passeraient pour la mauvaise raison.
grant select on storage.buckets to anon, authenticated, service_role;
grant select, insert, update, delete on storage.objects to anon, authenticated, service_role;

-- Même sémantique que la fonction Supabase : découpe le chemin et renvoie les
-- segments de dossier (tout sauf le nom de fichier).
create or replace function storage.foldername(name text)
returns text[]
language plpgsql
immutable
as $$
declare
  parts text[];
begin
  parts := string_to_array(name, '/');
  return parts[1:array_length(parts, 1) - 1];
end
$$;

grant usage on schema public to anon, authenticated, service_role;

-- Supabase ouvre par défaut les tables du schéma public à anon/authenticated.
-- On reproduit ce défaut : c'est précisément ce que 0002_rls.sql doit refermer.
alter default privileges in schema public
  grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public
  grant all on functions to anon, authenticated, service_role;
