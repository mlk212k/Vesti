-- ---------------------------------------------------------------------------
-- Vue des conversations de l'utilisateur courant.
--
-- Sans elle, afficher la liste du chat demanderait une requête par
-- conversation pour compter les non-lus et récupérer le dernier message.
-- Ici, une seule suffit.
--
-- `security_invoker = on` + jointure sur `auth.uid()` : la vue ne peut rendre
-- que les conversations dont on est membre, deux fois plutôt qu'une.
-- ---------------------------------------------------------------------------

create view public.v_my_conversations
with (security_invoker = on) as
select
  c.id,
  c.kind,
  c.title,
  c.last_message_at,
  m.last_read_at,
  -- Non-lus : ses propres messages ne comptent jamais comme non lus.
  (
    select count(*)
    from public.messages msg
    where msg.conversation_id = c.id
      and msg.created_at > m.last_read_at
      and msg.author_id is distinct from auth.uid()
  )::integer as unread,
  (
    select msg.body
    from public.messages msg
    where msg.conversation_id = c.id
    order by msg.created_at desc
    limit 1
  ) as last_body,
  (
    select p.full_name
    from public.messages msg
    join public.profiles p on p.id = msg.author_id
    where msg.conversation_id = c.id
    order by msg.created_at desc
    limit 1
  ) as last_author,
  -- Pour une conversation privée : le nom d'en face. Pour l'équipe, la liste
  -- sert d'aperçu des participants.
  (
    select string_agg(p.full_name, ', ' order by p.full_name)
    from public.conversation_members cm
    join public.profiles p on p.id = cm.user_id
    where cm.conversation_id = c.id
      and cm.user_id <> auth.uid()
  ) as other_names
from public.conversations c
join public.conversation_members m
  on m.conversation_id = c.id and m.user_id = auth.uid();

grant select on public.v_my_conversations to authenticated;
