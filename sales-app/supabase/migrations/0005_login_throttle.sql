-- ---------------------------------------------------------------------------
-- Limitation des tentatives de connexion.
--
-- Supabase applique déjà ses propres quotas sur l'endpoint d'auth ; ceci est
-- la couche applicative, qui compte par IP *et* par email.
--
-- Ces fonctions ne sont appelables NI par `anon` NI par `authenticated` :
-- seule la clé service_role (donc le serveur Next, jamais le navigateur) y a
-- accès. Sans ça, n'importe qui pourrait appeler `register_failed_login`
-- avec l'email du chef et le verrouiller dehors.
-- ---------------------------------------------------------------------------

create table public.login_attempts (
  key text primary key,
  attempts integer not null default 0,
  window_started_at timestamptz not null default now(),
  locked_until timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.login_attempts enable row level security;
-- Aucune policy : la table est invisible depuis les clés publiques.

-- Seuils : 5 échecs par IP sur 15 min, 10 par email sur 10 min.
create or replace function public.login_allowed(p_email text, p_ip text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select not exists (
    select 1 from public.login_attempts
    where key in ('ip:' || coalesce(p_ip, 'unknown'),
                  'email:' || lower(coalesce(p_email, '')))
      and locked_until is not null
      and locked_until > now()
  );
$$;

create or replace function public.register_failed_login(p_email text, p_ip text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_target record;
begin
  for v_target in
    select 'ip:' || coalesce(p_ip, 'unknown') as key,
           5 as max_attempts,
           interval '15 minutes' as window_length,
           interval '15 minutes' as lock_length
    union all
    select 'email:' || lower(coalesce(p_email, '')),
           10,
           interval '10 minutes',
           interval '10 minutes'
  loop
    insert into public.login_attempts (key, attempts)
    values (v_target.key, 1)
    on conflict (key) do update
    set
      -- Fenêtre glissante : au-delà de la fenêtre, on repart de 1.
      attempts = case
        when public.login_attempts.window_started_at < now() - v_target.window_length
          then 1
        else public.login_attempts.attempts + 1
      end,
      window_started_at = case
        when public.login_attempts.window_started_at < now() - v_target.window_length
          then now()
        else public.login_attempts.window_started_at
      end,
      updated_at = now();

    update public.login_attempts
    set locked_until = now() + v_target.lock_length
    where key = v_target.key and attempts >= v_target.max_attempts;
  end loop;
end;
$$;

create or replace function public.clear_login_attempts(p_email text, p_ip text)
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.login_attempts
  where key in ('ip:' || coalesce(p_ip, 'unknown'),
                'email:' || lower(coalesce(p_email, '')));
$$;

revoke all on function public.login_allowed(text, text) from public, anon, authenticated;
revoke all on function public.register_failed_login(text, text) from public, anon, authenticated;
revoke all on function public.clear_login_attempts(text, text) from public, anon, authenticated;
