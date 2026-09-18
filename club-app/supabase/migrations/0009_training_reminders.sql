-- Automatic day-of reminder for training sessions. A Vercel Cron job hits
-- an API route once a day that finds today's not-yet-reminded trainings
-- and notifies the relevant category's members; this column makes that
-- idempotent (a rerun, or a second cron fire on the same day, never
-- double-sends).
alter table public.events
  add column reminder_sent_at timestamptz;

-- The reminders cron runs with no signed-in user at all (Vercel Cron, not
-- a member's session), authenticated to Supabase via the service_role
-- key. Before, an absent auth.uid() happened to fall through the "not
-- authorized" check as an indeterminate NULL rather than true/false —
-- worked, but only by accident of three-valued logic. Make the
-- service_role path explicit instead of relying on that.
create or replace function public.get_push_subscriptions(target_user_id uuid)
returns setof public.push_subscriptions
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() = 'service_role' then
    return query
      select * from public.push_subscriptions where user_id = target_user_id;
    return;
  end if;

  if target_user_id <> auth.uid()
     and not public.current_role_is(array['admin', 'coach']::public.member_role[]) then
    raise exception 'not authorized';
  end if;

  return query
    select * from public.push_subscriptions where user_id = target_user_id;
end;
$$;
