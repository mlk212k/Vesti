-- ---------------------------------------------------------------------------
-- Planning de l'équipe, relances, réactions aux messages, photos de profil.
--
-- Quatre ajouts qui viennent du terrain :
--
--   1. Tout le monde n'est pas dispo tous les jours. Sans le planning,
--      l'encadrement ne sait pas si un commercial qui n'a pas ouvert sa
--      journée est en retard ou simplement pas censé travailler — et la
--      question se pose tous les matins.
--   2. Les relances : le manager doit pouvoir secouer quelqu'un depuis
--      l'app, et qu'il en reste une trace.
--   3. Les réactions : répondre « ok » à chaque message noie la
--      conversation d'équipe.
--   4. Les photos de profil, pour reconnaître qui parle d'un coup d'œil.
-- ---------------------------------------------------------------------------

-- Planning ------------------------------------------------------------------

-- Matin / après-midi. Deux créneaux suffisent pour du démarchage : personne
-- ne raisonne au quart d'heure près en faisant du porte-à-porte.
create type public.day_slot as enum ('am', 'pm');

create table public.availabilities (
  member_id uuid not null references public.profiles(id) on delete cascade,
  -- Convention ISO : 1 = lundi … 7 = dimanche, la même que
  -- `extract(isodow from date)`. Utiliser la convention américaine
  -- (0 = dimanche) obligerait à convertir à chaque requête, et on finirait
  -- par se tromper un jour sur deux.
  weekday smallint not null check (weekday between 1 and 7),
  slot public.day_slot not null,
  primary key (member_id, weekday, slot)
);

create index availabilities_weekday_idx on public.availabilities (weekday, slot);

-- Qui est censé travailler aujourd'hui, et a-t-il ouvert sa journée ?
create view public.v_planning_du_jour
with (security_invoker = on) as
select
  p.id as member_id,
  p.full_name,
  p.role,
  p.avatar_url,
  extract(isodow from (now() at time zone 'Europe/Paris'))::smallint as weekday,
  bool_or(a.slot = 'am') as matin,
  bool_or(a.slot = 'pm') as apres_midi,
  count(a.*) > 0 as attendu,
  exists (
    select 1 from public.work_days d
    where d.member_id = p.id
      and d.work_date = (now() at time zone 'Europe/Paris')::date
  ) as journee_ouverte
from public.profiles p
left join public.availabilities a
  on a.member_id = p.id
  and a.weekday = extract(isodow from (now() at time zone 'Europe/Paris'))::smallint
where p.is_active
group by p.id, p.full_name, p.role, p.avatar_url;

grant select on public.v_planning_du_jour to authenticated;

-- Relances ------------------------------------------------------------------

create table public.nudges (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.profiles(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  message text check (length(trim(message)) between 1 and 500),
  created_at timestamptz not null default now()
);

create index nudges_member_idx on public.nudges (member_id, created_at desc);

-- Une relance envoie une notification et laisse une trace. Réservée à
-- l'encadrement, et limitée à une par personne et par heure : une relance
-- qui tombe toutes les dix minutes n'est plus une relance, c'est du
-- harcèlement, et l'app ne doit pas servir à ça.
create or replace function public.send_nudge(p_member uuid, p_message text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_nom text;
  v_recent timestamptz;
begin
  if not public.is_staff() then
    raise exception 'FORBIDDEN';
  end if;
  if p_member = auth.uid() then
    raise exception 'INVALID_TARGET';
  end if;

  select full_name into v_nom from public.profiles where id = auth.uid();
  if v_nom is null then
    raise exception 'PROFILE_NOT_FOUND';
  end if;

  select max(created_at) into v_recent
  from public.nudges
  where member_id = p_member and created_at > now() - interval '1 hour';

  if v_recent is not null then
    raise exception 'NUDGE_TOO_SOON';
  end if;

  insert into public.nudges (member_id, sender_id, message)
  values (p_member, auth.uid(), nullif(trim(p_message), ''));

  perform public.notify_user(
    p_member,
    'nudge',
    v_nom || ' te relance',
    coalesce(nullif(trim(p_message), ''), 'Ouvre ta journée et lance-toi.'),
    '/'
  );

  insert into public.audit_logs (actor_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), 'member.nudged', 'profile', p_member,
          jsonb_build_object('message', nullif(trim(p_message), '')));
end;
$$;

revoke all on function public.send_nudge(uuid, text) from public, anon;
grant execute on function public.send_nudge(uuid, text) to authenticated;

-- Réactions -----------------------------------------------------------------

create table public.message_reactions (
  message_id uuid not null references public.messages(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  emoji text not null check (length(emoji) between 1 and 12),
  created_at timestamptz not null default now(),
  -- Une personne, un message, un emoji : recliquer sur le même retire la
  -- réaction côté app plutôt que d'en empiler dix.
  primary key (message_id, user_id, emoji)
);

create index message_reactions_message_idx on public.message_reactions (message_id);

-- Photos de profil ----------------------------------------------------------

-- Bucket PUBLIC, contrairement aux preuves de vente. Une photo de profil est
-- affichée des dizaines de fois par écran : passer par une URL signée à
-- chaque rendu coûterait un aller-retour par avatar, pour protéger… un
-- portrait que toute l'équipe voit déjà.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152,
        array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "avatars_insert_own_folder"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "avatars_update_own_folder"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "avatars_delete_own_folder"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- RLS -----------------------------------------------------------------------

alter table public.availabilities enable row level security;
alter table public.nudges enable row level security;
alter table public.message_reactions enable row level security;

-- Le planning est visible par toute l'équipe : savoir qui bosse quand n'est
-- pas une donnée sensible, c'est une information d'organisation.
create policy "availabilities_select" on public.availabilities
  for select to authenticated using (true);

-- Chacun gère ses créneaux ; l'encadrement peut aussi les poser, parce que
-- c'est souvent le chef qui connaît les dispos de son équipe avant elle.
create policy "availabilities_insert" on public.availabilities
  for insert to authenticated
  with check (member_id = auth.uid() or public.is_staff());

create policy "availabilities_delete" on public.availabilities
  for delete to authenticated
  using (member_id = auth.uid() or public.is_staff());

-- On voit les relances qu'on a reçues ; l'encadrement voit tout, sinon il ne
-- saurait pas qu'un collègue vient de relancer la même personne.
create policy "nudges_select" on public.nudges
  for select to authenticated
  using (member_id = auth.uid() or public.is_staff());

create policy "reactions_select" on public.message_reactions
  for select to authenticated
  using (
    exists (
      select 1 from public.messages m
      where m.id = message_id
        and public.is_conversation_member(m.conversation_id)
    )
  );

create policy "reactions_insert_self" on public.message_reactions
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.messages m
      where m.id = message_id
        and public.is_conversation_member(m.conversation_id)
    )
  );

create policy "reactions_delete_self" on public.message_reactions
  for delete to authenticated
  using (user_id = auth.uid());

alter publication supabase_realtime add table public.message_reactions;
