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
