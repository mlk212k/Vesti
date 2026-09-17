-- Member category (youth categories a joining member picks during
-- onboarding). Seniors are intentionally excluded — handled separately by
-- staff, not self-selected.
create type public.member_category as enum (
  'u6', 'u7', 'u8', 'u9', 'u10', 'u11', 'u12', 'u13',
  'u14', 'u15', 'u16', 'u17', 'u18_u19'
);

alter table public.profiles
  add column category public.member_category;

-- Self-service role at signup: handle_new_user() now also reads `role` and
-- `category` from the auth signup metadata. Role is deliberately clamped to
-- member/coach here — 'admin' can never come from user-supplied metadata,
-- only from an existing admin promoting someone via /members.
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
  return new;
end;
$$;

-- Avatars ---------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Each user's avatar lives at "<user_id>/<filename>" — the folder name
-- doubles as the ownership check, same pattern Supabase's own docs use.
create policy "avatar_public_read"
  on storage.objects for select
  to public
  using (bucket_id = 'avatars');

create policy "avatar_insert_own_folder"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "avatar_update_own_folder"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "avatar_delete_own_folder"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
