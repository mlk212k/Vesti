-- Club app schema: profiles, events, RSVPs, announcements, chat.
-- RLS is enabled on every table.

-- Enums --------------------------------------------------------------------

create type public.member_role as enum ('admin', 'coach', 'member');
create type public.event_kind as enum ('match', 'training', 'meeting', 'other');
create type public.rsvp_status as enum ('yes', 'no', 'maybe');

-- Profiles -----------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  jersey_number int,
  position text,
  role public.member_role not null default 'member',
  phone text,
  avatar_url text,
  created_at timestamptz not null default now()
);

create index profiles_role_idx on public.profiles (role);

-- Auto-provision profile on signup. Non-null full_name falls back to the
-- local-part of the email when the sign-up form omits it.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      split_part(new.email, '@', 1)
    )
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Role helper (security definer so RLS policies can call it without infinite
-- recursion against profiles).
create or replace function public.current_role_is(check_roles public.member_role[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role = any (check_roles)
  );
$$;

-- Events -------------------------------------------------------------------

create table public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  kind public.event_kind not null default 'other',
  location text,
  opponent text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

create index events_starts_at_idx on public.events (starts_at);

-- RSVPs --------------------------------------------------------------------

create table public.event_rsvps (
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status public.rsvp_status not null,
  updated_at timestamptz not null default now(),
  primary key (event_id, user_id)
);

create index rsvp_user_idx on public.event_rsvps (user_id);

-- Announcements ------------------------------------------------------------

create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  pinned boolean not null default false,
  author_id uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

create index announcements_created_at_idx on public.announcements (created_at desc);

-- Chat messages ------------------------------------------------------------

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  author_id uuid references auth.users(id) on delete set null,
  body text not null check (length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index messages_created_at_idx on public.messages (created_at);

-- RLS ----------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.events enable row level security;
alter table public.event_rsvps enable row level security;
alter table public.announcements enable row level security;
alter table public.messages enable row level security;

-- Profiles: any authenticated member reads; user updates own; admin
-- promotes/demotes and removes members.
create policy "profiles_select_authenticated"
  on public.profiles for select
  to authenticated
  using (true);

-- Members update their own row. Role changes are gated by the app layer:
-- the "update own profile" server action never writes the role column.
create policy "profiles_update_self"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "profiles_update_admin"
  on public.profiles for update
  to authenticated
  using (public.current_role_is(array['admin']::public.member_role[]))
  with check (public.current_role_is(array['admin']::public.member_role[]));

create policy "profiles_delete_admin"
  on public.profiles for delete
  to authenticated
  using (public.current_role_is(array['admin']::public.member_role[]));

-- Events: authenticated members read; admin/coach write.
create policy "events_select" on public.events
  for select to authenticated using (true);

create policy "events_insert_staff" on public.events
  for insert to authenticated
  with check (public.current_role_is(array['admin', 'coach']::public.member_role[]));

create policy "events_update_staff" on public.events
  for update to authenticated
  using (public.current_role_is(array['admin', 'coach']::public.member_role[]))
  with check (public.current_role_is(array['admin', 'coach']::public.member_role[]));

create policy "events_delete_staff" on public.events
  for delete to authenticated
  using (public.current_role_is(array['admin', 'coach']::public.member_role[]));

-- RSVPs: everyone reads (see the team's response); users manage their own.
create policy "rsvp_select" on public.event_rsvps
  for select to authenticated using (true);

create policy "rsvp_insert_self" on public.event_rsvps
  for insert to authenticated with check (user_id = auth.uid());

create policy "rsvp_update_self" on public.event_rsvps
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "rsvp_delete_self" on public.event_rsvps
  for delete to authenticated using (user_id = auth.uid());

-- Announcements: authenticated members read; admin/coach write.
create policy "announcements_select" on public.announcements
  for select to authenticated using (true);

create policy "announcements_insert_staff" on public.announcements
  for insert to authenticated
  with check (
    author_id = auth.uid()
    and public.current_role_is(array['admin', 'coach']::public.member_role[])
  );

create policy "announcements_update_staff" on public.announcements
  for update to authenticated
  using (public.current_role_is(array['admin', 'coach']::public.member_role[]))
  with check (public.current_role_is(array['admin', 'coach']::public.member_role[]));

create policy "announcements_delete_staff" on public.announcements
  for delete to authenticated
  using (public.current_role_is(array['admin', 'coach']::public.member_role[]));

-- Chat messages: all members read/write; author or admin can delete.
create policy "messages_select" on public.messages
  for select to authenticated using (true);

create policy "messages_insert_self" on public.messages
  for insert to authenticated with check (author_id = auth.uid());

create policy "messages_delete_owner_or_admin" on public.messages
  for delete to authenticated
  using (
    author_id = auth.uid()
    or public.current_role_is(array['admin']::public.member_role[])
  );

-- Realtime -----------------------------------------------------------------

-- Publish chat messages on the realtime channel so clients can subscribe.
alter publication supabase_realtime add table public.messages;
