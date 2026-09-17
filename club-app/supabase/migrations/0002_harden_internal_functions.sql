-- current_role_is() and handle_new_user() are internal helpers, not public
-- API: the first backs RLS policies, the second backs the auth.users
-- signup trigger. Both are SECURITY DEFINER, which Supabase's linter flags
-- when they're callable via the PostgREST RPC surface (anon/authenticated
-- can hit them directly at /rest/v1/rpc/<name>).
--
-- Revoke the public RPC surface, then grant back exactly what each
-- function is actually used for — Postgres requires EXECUTE to enter a
-- function even when it's only reached from an RLS policy's USING clause
-- or fired by a trigger, so a blanket revoke breaks both.
revoke execute on function public.current_role_is(public.member_role[]) from public;
revoke execute on function public.handle_new_user() from public;

-- current_role_is() is evaluated as `authenticated` by every admin/coach
-- RLS policy (events, announcements, profiles, messages).
grant execute on function public.current_role_is(public.member_role[]) to authenticated;

-- handle_new_user() fires as `supabase_auth_admin`, the role Supabase Auth
-- uses to insert into auth.users on signup.
grant execute on function public.handle_new_user() to supabase_auth_admin;
