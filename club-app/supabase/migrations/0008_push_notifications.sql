-- Web Push subscriptions, so staff can notify a member the moment they're
-- convoked (date/heure/lieu) instead of relying on them checking the app.
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

create index push_subscriptions_user_idx on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

create policy "push_subscriptions_select_own" on public.push_subscriptions
  for select to authenticated using (user_id = auth.uid());

create policy "push_subscriptions_delete_own" on public.push_subscriptions
  for delete to authenticated using (user_id = auth.uid());

-- A push endpoint can be re-registered by whoever now controls that
-- browser/device (e.g. a shared phone logging in as someone else), so
-- saving goes through a definer function that clears any prior owner
-- instead of an RLS-gated upsert that would fail across accounts.
create or replace function public.save_push_subscription(
  p_endpoint text, p_p256dh text, p_auth text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.push_subscriptions where endpoint = p_endpoint;
  insert into public.push_subscriptions (user_id, endpoint, p256dh, auth)
  values (auth.uid(), p_endpoint, p_p256dh, p_auth);
end;
$$;

-- Staff triggering a notification for someone else (a coach convoking a
-- player) needs that player's subscriptions to send to — the select policy
-- above only lets a user read their own rows, so this definer function
-- opens exactly that one extra path, gated the same way RLS is.
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

-- Lets sending code prune a dead endpoint (push service returned 404/410)
-- even when it belongs to someone else, same reasoning as save above.
create or replace function public.delete_push_subscription(p_endpoint text)
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.push_subscriptions where endpoint = p_endpoint;
$$;

-- Supabase's default privileges on the public schema auto-grant EXECUTE on
-- new functions to both anon and authenticated — revoking "from public"
-- alone doesn't touch that separate, explicit anon grant. These must never
-- run as anon: auth.uid() is null then, and get_push_subscriptions'
-- "target_user_id <> auth.uid()" is null (not true) in that case, so its
-- authorization check silently doesn't fire.
revoke execute on function public.save_push_subscription(text, text, text) from public, anon;
revoke execute on function public.get_push_subscriptions(uuid) from public, anon;
revoke execute on function public.delete_push_subscription(text) from public, anon;

grant execute on function public.save_push_subscription(text, text, text) to authenticated;
grant execute on function public.get_push_subscriptions(uuid) to authenticated;
grant execute on function public.delete_push_subscription(text) to authenticated;
