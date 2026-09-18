-- Match structuring: tag an event to a category (for convocation), and
-- record the final score once the match is played.
alter table public.events
  add column category public.member_category,
  add column score_home int,
  add column score_away int;

-- Player call-ups for a given event, distinct from self-declared RSVP:
-- staff picks who's convoked, typically filtered to the event's category.
create table public.event_callups (
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  called_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  primary key (event_id, user_id)
);

create index event_callups_user_idx on public.event_callups (user_id);

alter table public.event_callups enable row level security;

create policy "callups_select" on public.event_callups
  for select to authenticated using (true);

create policy "callups_insert_staff" on public.event_callups
  for insert to authenticated
  with check (
    called_by = auth.uid()
    and public.current_role_is(array['admin', 'coach']::public.member_role[])
  );

create policy "callups_delete_staff" on public.event_callups
  for delete to authenticated
  using (public.current_role_is(array['admin', 'coach']::public.member_role[]));
