-- Auto-confirm every new signup instead of depending on the Supabase
-- dashboard's "Confirm email" toggle (a setting on the Auth service, not
-- reachable from SQL, and easy to forget to flip). Without this, every
-- joining member gets stuck on "Invalid login credentials" right after
-- signing up until their email is manually confirmed — this club app has
-- no email delivery flow to make that self-service anyway.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_role public.member_role;
  requested_category public.member_category;
begin
  requested_role := case
    when new.raw_user_meta_data ->> 'role' = 'coach' then 'coach'::public.member_role
    else 'member'::public.member_role
  end;

  begin
    requested_category := (new.raw_user_meta_data ->> 'category')::public.member_category;
  exception when invalid_text_representation then
    requested_category := null;
  end;

  insert into public.profiles (id, full_name, role, category)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      split_part(new.email, '@', 1)
    ),
    requested_role,
    requested_category
  );

  update auth.users
  set email_confirmed_at = coalesce(email_confirmed_at, now())
  where id = new.id;

  return new;
end;
$$;
