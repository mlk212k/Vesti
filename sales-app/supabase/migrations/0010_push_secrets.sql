-- ===========================================================================
-- 0010 — LECTURE DES SECRETS PAR LA FONCTION EDGE
--
-- La migration 0009 faisait lire `vault.decrypted_secrets` directement par la
-- fonction Edge. Ça ne marche pas, et c'est structurel : PostgREST n'expose
-- que les schémas déclarés dans la configuration de l'API (`public`,
-- `graphql_public`). Le schéma `vault` n'en fait pas partie — la fonction
-- recevait donc une erreur et répondait « Secrets indisponibles ».
--
-- On n'expose PAS le schéma `vault` pour autant : ce serait ouvrir tous les
-- secrets du projet à l'API pour un seul besoin. À la place, une fonction
-- `security definer` qui ne rend QUE les cinq clés du push, et à laquelle
-- seul le rôle de service a le droit d'accéder.
--
-- Le verrouillage tient en deux lignes, et les deux comptent :
--
--   revoke … from public, anon, authenticated  — personne d'autre ;
--   grant  … to service_role                   — et lui seul.
--
-- Sans le `revoke`, une fonction créée dans `public` est exécutable par
-- `anon` par défaut : n'importe qui avec la clé publique de l'app lirait la
-- clé privée VAPID.
-- ===========================================================================

create or replace function public.lire_secrets_push()
returns jsonb
language plpgsql
security definer
set search_path = vault, public
as $$
declare
  v_config jsonb;
begin
  select coalesce(jsonb_object_agg(name, decrypted_secret), '{}'::jsonb)
    into v_config
  from vault.decrypted_secrets
  where name in (
    'vapid_public_key',
    'vapid_private_key',
    'vapid_subject',
    'push_shared_secret'
  );

  return v_config;
end;
$$;

revoke all on function public.lire_secrets_push() from public, anon, authenticated;
grant execute on function public.lire_secrets_push() to service_role;
