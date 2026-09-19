-- ---------------------------------------------------------------------------
-- Row Level Security.
--
-- Lecture de ce fichier en une phrase : un membre ne lit que ses lignes,
-- l'encadrement lit celles de l'équipe, et PERSONNE n'écrit directement dans
-- les tables où l'argent et le stock se jouent — ces écritures passent par
-- les fonctions de 0003_functions.sql.
--
-- Conséquence concrète : changer l'`id` dans une URL, ou rejouer une requête
-- REST à la main avec la clé anon, ne donne rien. Le filtre est dans la base,
-- pas dans la page.
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.app_settings enable row level security;
alter table public.card_batches enable row level security;
alter table public.card_allocations enable row level security;
alter table public.card_movements enable row level security;
alter table public.work_days enable row level security;
alter table public.businesses enable row level security;
alter table public.sales enable row level security;
alter table public.commission_payouts enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_logs enable row level security;

-- Profils -------------------------------------------------------------------
--
-- Le nom et le rôle des collègues sont lisibles par toute l'équipe : sans ça
-- le chat n'affiche que des identifiants. Ce qui est protégé, c'est l'argent
-- et l'activité — pas l'existence d'un collègue.

create policy "profiles_select_authenticated"
  on public.profiles for select
  to authenticated
  using (true);

create policy "profiles_update_self"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "profiles_update_admin"
  on public.profiles for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "profiles_delete_admin"
  on public.profiles for delete
  to authenticated
  using (public.is_admin());

-- La policy « update self » autorise la ligne, pas les colonnes. Ce garde-fou
-- interdit à quiconque n'est pas admin de se promouvoir, de se réactiver ou
-- de baisser son propre objectif — même en tapant directement sur l'API REST.
--
-- `auth.uid() is null` = requête sans JWT, c'est-à-dire la clé service_role
-- depuis le serveur (création d'un compte par l'admin, seed). Ce cas doit
-- passer : c'est lui qui pose le rôle juste après la création du compte.
-- Il n'ouvre rien, parce qu'une requête anonyme, elle aussi sans JWT, est
-- déjà arrêtée avant : toutes les policies de `profiles` sont réservées au
-- rôle `authenticated`, donc `anon` n'a aucun droit d'UPDATE à faire valoir.
create or replace function public.guard_profile_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or public.is_admin() then
    return new;
  end if;

  if new.role is distinct from old.role
     or new.is_active is distinct from old.is_active
     or new.daily_goal_override is distinct from old.daily_goal_override then
    raise exception 'FORBIDDEN_FIELD';
  end if;

  return new;
end;
$$;

create trigger profiles_guard
  before update on public.profiles
  for each row execute function public.guard_profile_update();

-- Paramètres ----------------------------------------------------------------
-- Lisibles par tous (le membre doit voir le taux appliqué à ses ventes et son
-- objectif), modifiables par l'admin seul.

create policy "settings_select" on public.app_settings
  for select to authenticated using (true);

create policy "settings_update_admin" on public.app_settings
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Stock ---------------------------------------------------------------------
-- Aucune policy d'écriture : tout passe par restock_cards / allocate_cards /
-- return_cards / register_card_loss / adjust_stock.

create policy "batches_select_staff" on public.card_batches
  for select to authenticated using (public.is_staff());

create policy "allocations_select" on public.card_allocations
  for select to authenticated using (public.can_view_member(member_id));

create policy "movements_select" on public.card_movements
  for select to authenticated
  using (
    -- Mouvements de dépôt (sans membre) : encadrement uniquement.
    case when member_id is null then public.is_staff()
         else public.can_view_member(member_id) end
  );

-- Journées ------------------------------------------------------------------
-- Écriture via start_work_day / end_work_day / validate_work_day.

create policy "work_days_select" on public.work_days
  for select to authenticated using (public.can_view_member(member_id));

-- Commerces -----------------------------------------------------------------
-- Ici l'écriture directe est légitime : une fiche commerce n'engage ni le
-- stock ni l'argent, et elle appartient à son auteur.

create policy "businesses_select" on public.businesses
  for select to authenticated using (public.can_view_member(member_id));

create policy "businesses_insert_self" on public.businesses
  for insert to authenticated with check (member_id = auth.uid());

create policy "businesses_update_own" on public.businesses
  for update to authenticated
  using (member_id = auth.uid() or public.is_staff())
  with check (member_id = auth.uid() or public.is_staff());

create policy "businesses_delete_own" on public.businesses
  for delete to authenticated
  using (member_id = auth.uid() or public.is_admin());

-- Ventes --------------------------------------------------------------------
-- Lecture seule côté client. Écriture via record_sale / update_sale /
-- delete_sale, qui sont les seules à savoir tenir le stock à jour en même
-- temps.

create policy "sales_select" on public.sales
  for select to authenticated using (public.can_view_member(member_id));

-- Commissions ---------------------------------------------------------------

create policy "payouts_select" on public.commission_payouts
  for select to authenticated using (public.can_view_member(member_id));

-- Chat ----------------------------------------------------------------------

-- Fonction dédiée : une policy sur conversation_members qui interrogerait
-- conversation_members tournerait en rond (récursion infinie).
create or replace function public.is_conversation_member(p_conversation uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.conversation_members
    where conversation_id = p_conversation and user_id = auth.uid()
  );
$$;

grant execute on function public.is_conversation_member(uuid) to authenticated;

create policy "conversations_select" on public.conversations
  for select to authenticated
  using (public.is_conversation_member(id));

create policy "conversation_members_select" on public.conversation_members
  for select to authenticated
  using (public.is_conversation_member(conversation_id));

-- Marquer « lu » = écrire sur sa propre ligne d'appartenance.
create policy "conversation_members_update_self" on public.conversation_members
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "messages_select" on public.messages
  for select to authenticated
  using (public.is_conversation_member(conversation_id));

create policy "messages_insert" on public.messages
  for insert to authenticated
  with check (
    author_id = auth.uid()
    and public.is_conversation_member(conversation_id)
  );

create policy "messages_delete_own_or_admin" on public.messages
  for delete to authenticated
  using (author_id = auth.uid() or public.is_admin());

-- Notifications -------------------------------------------------------------
-- Créées par les fonctions métier ; le destinataire peut seulement les lire
-- et les marquer comme lues.

create policy "notifications_select_own" on public.notifications
  for select to authenticated using (user_id = auth.uid());

create policy "notifications_update_own" on public.notifications
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Audit ---------------------------------------------------------------------
-- Consultable par l'admin seul, et par personne en écriture : les lignes sont
-- posées par log_audit() et par les fonctions métier.

create policy "audit_select_admin" on public.audit_logs
  for select to authenticated using (public.is_admin());

-- Droits de lecture sur les vues --------------------------------------------

grant select on public.v_member_cards to authenticated;
grant select on public.v_stock_summary to authenticated;
grant select on public.v_work_day_stats to authenticated;
grant select on public.v_member_totals to authenticated;

-- Temps réel ----------------------------------------------------------------
-- Le chat s'abonne aux nouveaux messages. La RLS s'applique aussi au flux
-- temps réel : on ne reçoit que les messages des conversations dont on fait
-- partie.

alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.notifications;
