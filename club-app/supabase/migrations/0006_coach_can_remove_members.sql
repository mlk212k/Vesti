-- Coaches can now expel members (app layer already refuses coach-on-admin
-- removals in removeMemberAction) — RLS must allow it too, or every
-- coach delete would fail silently regardless of the app-level check.
drop policy "profiles_delete_admin" on public.profiles;

create policy "profiles_delete_staff"
  on public.profiles for delete
  to authenticated
  using (
    public.current_role_is(array['admin', 'coach']::public.member_role[])
    and role <> 'admin'
    or public.current_role_is(array['admin']::public.member_role[])
  );
