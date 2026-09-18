-- The training-reminders cron originally needed the Supabase service_role
-- key (bypasses RLS) since it has no signed-in user. In practice that key
-- was painful to copy off the Supabase dashboard on a phone (clipboard
-- permissions kept failing on that specific page). This replaces it with
-- a shared-secret pattern using only the already-public anon key:
-- app_secrets is locked down by RLS with zero policies (so nothing can
-- read it via the REST API, direct or otherwise — only a SECURITY
-- DEFINER function, which bypasses RLS, ever sees a row), and each
-- cron_* function refuses to do anything unless the caller supplies the
-- matching secret. The secret's actual value is deliberately never
-- written into a migration file (this repo is public) — it's inserted
-- separately as a one-off admin action.
create table public.app_secrets (
  key text primary key,
  value text not null
);

alter table public.app_secrets enable row level security;

create or replace function public.cron_due_training_reminders(
  p_secret text, p_start timestamptz, p_end timestamptz
)
returns table (
  training_id uuid,
  title text,
  category public.member_category,
  starts_at timestamptz,
  location text,
  user_id uuid,
  endpoint text,
  p256dh text,
  auth text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_secret text := (select value from public.app_secrets where key = 'cron_secret');
begin
  if v_secret is null or p_secret is distinct from v_secret then
    raise exception 'not authorized';
  end if;

  return query
    select e.id, e.title, e.category, e.starts_at, e.location,
           ps.user_id, ps.endpoint, ps.p256dh, ps.auth
    from public.events e
    join public.profiles p
      on (e.category is null or p.category = e.category)
    join public.push_subscriptions ps
      on ps.user_id = p.id
    where e.kind = 'training'
      and e.reminder_sent_at is null
      and e.starts_at >= p_start
      and e.starts_at < p_end;
end;
$$;

create or replace function public.cron_mark_reminders_sent(
  p_secret text, p_training_ids uuid[]
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_secret text := (select value from public.app_secrets where key = 'cron_secret');
begin
  if v_secret is null or p_secret is distinct from v_secret then
    raise exception 'not authorized';
  end if;

  update public.events
    set reminder_sent_at = now()
    where id = any(p_training_ids);
end;
$$;

create or replace function public.cron_delete_push_subscription(
  p_secret text, p_endpoint text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_secret text := (select value from public.app_secrets where key = 'cron_secret');
begin
  if v_secret is null or p_secret is distinct from v_secret then
    raise exception 'not authorized';
  end if;

  delete from public.push_subscriptions where endpoint = p_endpoint;
end;
$$;

revoke execute on function public.cron_due_training_reminders(text, timestamptz, timestamptz) from public;
revoke execute on function public.cron_mark_reminders_sent(text, uuid[]) from public;
revoke execute on function public.cron_delete_push_subscription(text, text) from public;

grant execute on function public.cron_due_training_reminders(text, timestamptz, timestamptz) to anon;
grant execute on function public.cron_mark_reminders_sent(text, uuid[]) to anon;
grant execute on function public.cron_delete_push_subscription(text, text) to anon;

-- The service_role special-case added in 0009 is now dead code — nothing
-- calls this function as service_role anymore now that the cron doesn't
-- use that key. Restore the plain version so its behavior isn't
-- misleading about what actually happens in production.
create or replace function public.get_push_subscriptions(target_user_id uuid)
returns setof public.push_subscriptions
language plpgsql
security definer
set search_path = public
as $$
begin
  if target_user_id <> auth.uid()
     and not public.current_role_is(array['admin', 'coach']::public.member_role[]) then
    raise exception 'not authorized';
  end if;

  return query
    select * from public.push_subscriptions where user_id = target_user_id;
end;
$$;
