-- ===========================================================================
-- 0009 — NOTIFICATIONS PUSH
--
-- Jusqu'ici, une notification n'existait que dans l'app : il fallait
-- l'ouvrir pour la voir. Une relance envoyée à quelqu'un qui n'a pas ouvert
-- sa journée n'arrivait donc jamais au bon moment — c'est-à-dire avant
-- qu'il parte.
--
-- Le chemin complet :
--
--   1. le téléphone s'abonne (Web Push) et range son abonnement dans
--      `push_subscriptions` ;
--   2. quelque chose crée une ligne dans `notifications` (message, relance,
--      validation de journée…) ;
--   3. le trigger ci-dessous appelle, SANS BLOQUER, la fonction Edge
--      `push` via pg_net ;
--   4. la fonction Edge signe et chiffre le message avec les clés VAPID et
--      le remet au service de push du navigateur.
--
-- Pourquoi un trigger et pas l'application : les notifications sont créées
-- par des fonctions SQL (`notify_user`, `notify_staff`, le trigger de
-- message). L'application, elle, ne sait pas toujours qui est destinataire.
-- En branchant l'envoi sur la TABLE, aucune notification ne peut être créée
-- sans partir — y compris celles créées par une fonction écrite demain.
--
-- Les secrets (clé privée VAPID, secret partagé, URL) vivent dans le Vault
-- Supabase, chiffrés, lisibles seulement par le rôle de service.
-- ===========================================================================

-- pg_net n'existe que sur Supabase. Les tests rejouent ce fichier sur un
-- Postgres nu, où `create extension` échouerait et bloquerait toute la
-- suite ; `supabase/tests/00_stub_supabase.sql` y fournit un `net.http_post`
-- qui ne part sur aucun réseau. La garde porte donc sur la DISPONIBILITÉ de
-- l'extension, pas sur un comportement métier : le schéma obtenu est le même
-- des deux côtés.
do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_net') then
    create extension if not exists pg_net with schema extensions;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Les abonnements
-- ---------------------------------------------------------------------------

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  -- L'endpoint identifie le couple (navigateur, appareil). Il est unique :
  -- réinstaller l'app sur le même téléphone remplace l'abonnement au lieu
  -- d'en empiler un deuxième, sinon chaque notification arriverait en
  -- double.
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);

create index if not exists push_subscriptions_user_idx
  on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

-- Un abonnement est un identifiant d'appareil : on ne voit, ne crée et ne
-- supprime que les siens. Personne ne peut lister les appareils de
-- quelqu'un d'autre, pas même l'admin — ça ne lui servirait à rien et ça
-- ouvrirait une porte.
drop policy if exists push_select_own on public.push_subscriptions;
create policy push_select_own on public.push_subscriptions
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists push_insert_own on public.push_subscriptions;
create policy push_insert_own on public.push_subscriptions
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists push_delete_own on public.push_subscriptions;
create policy push_delete_own on public.push_subscriptions
  for delete to authenticated
  using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Le déclenchement
-- ---------------------------------------------------------------------------

create or replace function public.pousser_notification()
returns trigger
language plpgsql
security definer
set search_path = public, extensions, vault
as $$
declare
  v_url text;
  v_secret text;
begin
  select decrypted_secret into v_url
    from vault.decrypted_secrets where name = 'push_function_url';
  select decrypted_secret into v_secret
    from vault.decrypted_secrets where name = 'push_shared_secret';

  -- Tant que les secrets ne sont pas renseignés, l'app marche exactement
  -- pareil : la notification existe en base, elle ne part juste pas en
  -- push. Une notification ne doit JAMAIS échouer parce que l'envoi
  -- extérieur est mal configuré.
  if v_url is null or v_secret is null then
    return new;
  end if;

  -- `net.http_post` est asynchrone : l'insertion de la notification n'attend
  -- pas le service de push. Un opérateur de push lent ne doit pas ralentir
  -- l'envoi d'un message dans le chat.
  perform net.http_post(
    url := v_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-arena-secret', v_secret
    ),
    body := jsonb_build_object('notification_id', new.id),
    timeout_milliseconds := 5000
  );

  return new;
end;
$$;

revoke all on function public.pousser_notification() from public, anon, authenticated;

drop trigger if exists notifications_push on public.notifications;
create trigger notifications_push
  after insert on public.notifications
  for each row execute function public.pousser_notification();
