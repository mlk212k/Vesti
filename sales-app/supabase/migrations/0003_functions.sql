-- ---------------------------------------------------------------------------
-- Logique métier transactionnelle.
--
-- Pourquoi des fonctions et pas du code applicatif : une vente touche trois
-- tables (sales, card_movements, audit_logs) et doit vérifier un invariant
-- (« on ne vend pas plus de cartes qu'on n'en a »). Dans une fonction, tout
-- ça est UNE transaction, avec un verrou par membre — deux ventes envoyées
-- en même temps depuis deux onglets ne peuvent pas passer sous le radar.
--
-- Chaque fonction revérifie `auth.uid()` et le rôle. Elles sont la seule
-- porte d'écriture sur les ventes, les journées et le stock : ces tables
-- n'ont aucune policy d'INSERT/UPDATE (voir 0004_rls.sql).
-- ---------------------------------------------------------------------------

-- Helpers internes ----------------------------------------------------------

create or replace function public.notify_user(
  p_user uuid,
  p_kind text,
  p_title text,
  p_body text default null,
  p_link text default null
)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.notifications (user_id, kind, title, body, link)
  values (p_user, p_kind, p_title, p_body, p_link);
$$;

revoke all on function public.notify_user(uuid, text, text, text, text)
  from public, anon, authenticated;

-- Prévient l'encadrement (admin + managers), en s'excluant soi-même : on ne
-- se notifie pas de sa propre action.
create or replace function public.notify_staff(
  p_kind text,
  p_title text,
  p_body text default null,
  p_link text default null
)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.notifications (user_id, kind, title, body, link)
  select p.id, p_kind, p_title, p_body, p_link
  from public.profiles p
  where p.role in ('admin', 'manager')
    and p.is_active
    and p.id is distinct from auth.uid();
$$;

revoke all on function public.notify_staff(text, text, text, text)
  from public, anon, authenticated;

create or replace function public.warehouse_stock()
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(warehouse_delta), 0)::integer from public.card_movements;
$$;

create or replace function public.member_cards_held(p_member uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(member_delta), 0)::integer
  from public.card_movements
  where member_id = p_member;
$$;

grant execute on function public.warehouse_stock() to authenticated;
grant execute on function public.member_cards_held(uuid) to authenticated;

-- Stock ---------------------------------------------------------------------

-- Entrée de stock. Admin uniquement : c'est lui qui achète les cartes.
create or replace function public.restock_cards(
  p_quantity integer,
  p_label text default 'Réapprovisionnement',
  p_unit_cost_cents integer default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_batch uuid;
begin
  if not public.is_admin() then
    raise exception 'FORBIDDEN';
  end if;
  if p_quantity is null or p_quantity <= 0 then
    raise exception 'INVALID_QUANTITY';
  end if;

  insert into public.card_batches (label, quantity, unit_cost_cents, created_by)
  values (coalesce(nullif(trim(p_label), ''), 'Réapprovisionnement'),
          p_quantity, p_unit_cost_cents, auth.uid())
  returning id into v_batch;

  insert into public.card_movements
    (kind, quantity, warehouse_delta, member_delta, actor_id, note)
  values ('restock', p_quantity, p_quantity, 0, auth.uid(), p_label);

  insert into public.audit_logs (actor_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), 'stock.restocked', 'card_batch', v_batch,
          jsonb_build_object('quantity', p_quantity));

  return v_batch;
end;
$$;

-- Attribution de cartes à un membre. Admin et manager.
create or replace function public.allocate_cards(
  p_member uuid,
  p_quantity integer,
  p_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_allocation uuid;
  v_name text;
begin
  if not public.is_staff() then
    raise exception 'FORBIDDEN';
  end if;
  if p_quantity is null or p_quantity <= 0 then
    raise exception 'INVALID_QUANTITY';
  end if;

  select full_name into v_name from public.profiles where id = p_member;
  if v_name is null then
    raise exception 'MEMBER_NOT_FOUND';
  end if;

  -- Sérialise les mouvements de stock : deux attributions simultanées ne
  -- peuvent pas descendre le dépôt sous zéro chacune de son côté.
  perform pg_advisory_xact_lock(hashtext('warehouse'));

  if public.warehouse_stock() < p_quantity then
    raise exception 'NOT_ENOUGH_STOCK';
  end if;

  insert into public.card_allocations (member_id, quantity, note, allocated_by)
  values (p_member, p_quantity, p_note, auth.uid())
  returning id into v_allocation;

  insert into public.card_movements
    (kind, quantity, warehouse_delta, member_delta, member_id, allocation_id, actor_id, note)
  values ('allocation', p_quantity, -p_quantity, p_quantity, p_member, v_allocation, auth.uid(), p_note);

  insert into public.audit_logs (actor_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), 'cards.allocated', 'card_allocation', v_allocation,
          jsonb_build_object('member_id', p_member, 'quantity', p_quantity));

  perform public.notify_user(
    p_member, 'cards_allocated',
    p_quantity || ' carte' || case when p_quantity > 1 then 's' else '' end || ' attribuée' || case when p_quantity > 1 then 's' else '' end,
    'Tu as reçu ' || p_quantity || ' carte' || case when p_quantity > 1 then 's' else '' end || ' à vendre.',
    '/cartes'
  );

  return v_allocation;
end;
$$;

-- Retour de cartes invendues au dépôt.
create or replace function public.return_cards(
  p_member uuid,
  p_quantity integer,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_staff() then
    raise exception 'FORBIDDEN';
  end if;
  if p_quantity is null or p_quantity <= 0 then
    raise exception 'INVALID_QUANTITY';
  end if;

  perform pg_advisory_xact_lock(hashtext(p_member::text));

  if public.member_cards_held(p_member) < p_quantity then
    raise exception 'NOT_ENOUGH_CARDS';
  end if;

  insert into public.card_movements
    (kind, quantity, warehouse_delta, member_delta, member_id, actor_id, note)
  values ('return', p_quantity, p_quantity, -p_quantity, p_member, auth.uid(), p_note);

  insert into public.audit_logs (actor_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), 'cards.returned', 'profile', p_member,
          jsonb_build_object('quantity', p_quantity));
end;
$$;

-- Cartes perdues / abîmées : elles quittent le membre sans revenir au dépôt.
create or replace function public.register_card_loss(
  p_member uuid,
  p_quantity integer,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_staff() then
    raise exception 'FORBIDDEN';
  end if;
  if p_quantity is null or p_quantity <= 0 then
    raise exception 'INVALID_QUANTITY';
  end if;

  perform pg_advisory_xact_lock(hashtext(p_member::text));

  if public.member_cards_held(p_member) < p_quantity then
    raise exception 'NOT_ENOUGH_CARDS';
  end if;

  insert into public.card_movements
    (kind, quantity, warehouse_delta, member_delta, member_id, actor_id, note)
  values ('loss', p_quantity, 0, -p_quantity, p_member, auth.uid(), p_note);

  insert into public.audit_logs (actor_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), 'cards.lost', 'profile', p_member,
          jsonb_build_object('quantity', p_quantity, 'note', p_note));
end;
$$;

-- Correction d'inventaire au dépôt (recomptage). Admin uniquement.
create or replace function public.adjust_stock(
  p_delta integer,
  p_note text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'FORBIDDEN';
  end if;
  if p_delta is null or p_delta = 0 then
    raise exception 'INVALID_QUANTITY';
  end if;
  if coalesce(nullif(trim(p_note), ''), '') = '' then
    raise exception 'NOTE_REQUIRED';
  end if;

  perform pg_advisory_xact_lock(hashtext('warehouse'));

  if public.warehouse_stock() + p_delta < 0 then
    raise exception 'NOT_ENOUGH_STOCK';
  end if;

  insert into public.card_movements
    (kind, quantity, warehouse_delta, member_delta, actor_id, note)
  values ('adjustment', abs(p_delta), p_delta, 0, auth.uid(), p_note);

  insert into public.audit_logs (actor_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), 'stock.adjusted', 'card_movement', null,
          jsonb_build_object('delta', p_delta, 'note', p_note));
end;
$$;

-- Journées ------------------------------------------------------------------

-- « COMMENCER MA JOURNÉE ». Rouvre la journée du jour si elle avait été
-- terminée par erreur — tant qu'elle n'est pas validée.
create or replace function public.start_work_day()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_today date := (now() at time zone 'Europe/Paris')::date;
  v_goal integer;
  v_day public.work_days;
begin
  if v_user is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  select coalesce(p.daily_goal_override, s.default_daily_goal)
    into v_goal
  from public.profiles p
  cross join public.app_settings s
  where p.id = v_user and s.id = 1;

  if v_goal is null then
    raise exception 'PROFILE_NOT_FOUND';
  end if;

  select * into v_day
  from public.work_days
  where member_id = v_user and work_date = v_today;

  if found then
    if v_day.status = 'validated' then
      raise exception 'DAY_ALREADY_VALIDATED';
    end if;
    if v_day.status = 'in_progress' then
      return v_day.id;
    end if;

    update public.work_days
    set status = 'in_progress', ended_at = null
    where id = v_day.id;

    insert into public.audit_logs (actor_id, action, entity_type, entity_id, metadata)
    values (v_user, 'workday.reopened', 'work_day', v_day.id, '{}'::jsonb);

    return v_day.id;
  end if;

  insert into public.work_days (member_id, work_date, goal_cards)
  values (v_user, v_today, v_goal)
  returning * into v_day;

  insert into public.audit_logs (actor_id, action, entity_type, entity_id, metadata)
  values (v_user, 'workday.started', 'work_day', v_day.id,
          jsonb_build_object('goal_cards', v_goal));

  perform public.notify_staff(
    'day_started',
    (select full_name from public.profiles where id = v_user) || ' a commencé sa journée',
    'Objectif : ' || v_goal || ' cartes.',
    '/equipe'
  );

  return v_day.id;
end;
$$;

-- « TERMINER MA JOURNÉE ».
create or replace function public.end_work_day(p_notes text default null)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_day public.work_days;
  v_sold integer;
begin
  if v_user is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  select * into v_day
  from public.work_days
  where member_id = v_user and status = 'in_progress';

  if not found then
    raise exception 'NO_OPEN_DAY';
  end if;

  update public.work_days
  set ended_at = now(),
      status = 'ended',
      notes = coalesce(nullif(trim(p_notes), ''), notes)
  where id = v_day.id;

  select coalesce(sum(quantity), 0) into v_sold
  from public.sales where work_day_id = v_day.id;

  insert into public.audit_logs (actor_id, action, entity_type, entity_id, metadata)
  values (v_user, 'workday.ended', 'work_day', v_day.id,
          jsonb_build_object('cards_sold', v_sold, 'goal_cards', v_day.goal_cards));

  perform public.notify_staff(
    'day_ended',
    (select full_name from public.profiles where id = v_user) || ' a terminé sa journée',
    v_sold || ' / ' || v_day.goal_cards || ' cartes vendues.',
    '/equipe'
  );

  return v_day.id;
end;
$$;

-- Validation d'une journée par l'encadrement.
--
-- C'est ICI, et nulle part ailleurs, qu'une pénalité peut être appliquée :
-- un humain regarde la journée et décide. Rien n'est jamais retiré
-- automatiquement à qui que ce soit.
create or replace function public.validate_work_day(
  p_day uuid,
  p_penalty_cents integer default 0
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_day public.work_days;
begin
  if not public.is_staff() then
    raise exception 'FORBIDDEN';
  end if;
  if p_penalty_cents is null or p_penalty_cents < 0 then
    raise exception 'INVALID_AMOUNT';
  end if;

  select * into v_day from public.work_days where id = p_day;
  if not found then
    raise exception 'DAY_NOT_FOUND';
  end if;
  if v_day.status = 'in_progress' then
    raise exception 'DAY_STILL_OPEN';
  end if;

  update public.work_days
  set status = 'validated',
      penalty_cents = p_penalty_cents,
      validated_by = auth.uid(),
      validated_at = now()
  where id = p_day;

  insert into public.audit_logs (actor_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), 'workday.validated', 'work_day', p_day,
          jsonb_build_object('penalty_cents', p_penalty_cents, 'member_id', v_day.member_id));

  perform public.notify_user(
    v_day.member_id, 'day_validated', 'Journée du ' || to_char(v_day.work_date, 'DD/MM') || ' validée',
    case when p_penalty_cents > 0
      then 'Une retenue de ' || to_char(p_penalty_cents / 100.0, 'FM999999990.00') || ' € a été appliquée.'
      else 'Aucune retenue.'
    end,
    '/historique'
  );
end;
$$;

-- Ventes --------------------------------------------------------------------

-- Enregistre une vente. Le montant n'est PAS un paramètre : il est calculé
-- par les colonnes générées de `sales`. Le front peut envoyer ce qu'il veut,
-- seul quantité × prix unitaire fait foi.
create or replace function public.record_sale(
  p_quantity integer,
  p_unit_price_cents integer default null,
  p_business uuid default null,
  p_notes text default null,
  p_photo_url text default null,
  p_sold_at timestamptz default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_day public.work_days;
  v_price integer;
  v_rate integer;
  v_sale uuid;
  v_sold_at timestamptz;
  v_sold_before integer;
  v_sold_after integer;
  v_name text;
begin
  if v_user is null then
    raise exception 'AUTH_REQUIRED';
  end if;
  if p_quantity is null or p_quantity <= 0 or p_quantity > 1000 then
    raise exception 'INVALID_QUANTITY';
  end if;

  select default_card_price_cents, commission_rate_bp
    into v_price, v_rate
  from public.app_settings where id = 1;

  if p_unit_price_cents is not null then
    if p_unit_price_cents < 0 or p_unit_price_cents > 100000000 then
      raise exception 'INVALID_PRICE';
    end if;
    v_price := p_unit_price_cents;
  end if;

  perform pg_advisory_xact_lock(hashtext(v_user::text));

  select * into v_day
  from public.work_days
  where member_id = v_user and status = 'in_progress';

  if not found then
    raise exception 'NO_OPEN_DAY';
  end if;

  -- On ne vend pas des cartes qu'on n'a pas.
  if public.member_cards_held(v_user) < p_quantity then
    raise exception 'NOT_ENOUGH_CARDS';
  end if;

  -- Le commerce, s'il est fourni, doit appartenir au vendeur.
  if p_business is not null then
    if not exists (
      select 1 from public.businesses
      where id = p_business and member_id = v_user
    ) then
      raise exception 'BUSINESS_NOT_FOUND';
    end if;
  end if;

  -- Une vente est horodatée dans sa journée. On accepte une heure saisie à
  -- la main (le commercial note sa vente 20 min après), mais jamais avant le
  -- début de journée ni dans le futur.
  v_sold_at := coalesce(p_sold_at, now());
  if v_sold_at < v_day.started_at then v_sold_at := v_day.started_at; end if;
  if v_sold_at > now() then v_sold_at := now(); end if;

  select coalesce(sum(quantity), 0) into v_sold_before
  from public.sales where work_day_id = v_day.id;

  insert into public.sales (
    member_id, work_day_id, business_id, quantity, unit_price_cents,
    commission_rate_bp, sold_at, notes, photo_url, created_by
  )
  values (
    v_user, v_day.id, p_business, p_quantity, v_price,
    v_rate, v_sold_at, nullif(trim(p_notes), ''), nullif(trim(p_photo_url), ''), v_user
  )
  returning id into v_sale;

  insert into public.card_movements
    (kind, quantity, warehouse_delta, member_delta, member_id, sale_id, actor_id, note)
  values ('sale', p_quantity, 0, -p_quantity, v_user, v_sale, v_user, 'Vente');

  insert into public.audit_logs (actor_id, action, entity_type, entity_id, metadata)
  values (v_user, 'sale.created', 'sale', v_sale,
          jsonb_build_object('quantity', p_quantity, 'unit_price_cents', v_price,
                             'amount_cents', p_quantity * v_price));

  v_sold_after := v_sold_before + p_quantity;

  -- Notifie le franchissement de l'objectif, une seule fois.
  if v_sold_before < v_day.goal_cards and v_sold_after >= v_day.goal_cards then
    select full_name into v_name from public.profiles where id = v_user;
    perform public.notify_user(v_user, 'goal_reached', 'Objectif atteint 🔥',
      v_sold_after || ' / ' || v_day.goal_cards || ' cartes vendues aujourd''hui.', '/');
    perform public.notify_staff('goal_reached', v_name || ' a atteint son objectif',
      v_sold_after || ' / ' || v_day.goal_cards || ' cartes.', '/equipe');
  end if;

  return v_sale;
end;
$$;

-- Modification d'une vente.
--
-- Le stock n'est pas réécrit : on ajoute un mouvement de correction. Le
-- grand livre reste en ajout seul, donc l'historique reste lisible — on voit
-- la vente, puis sa correction, comme sur un relevé bancaire.
create or replace function public.update_sale(
  p_sale uuid,
  p_quantity integer,
  p_unit_price_cents integer,
  p_business uuid default null,
  p_notes text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_sale public.sales;
  v_day public.work_days;
  v_diff integer;
begin
  if v_user is null then
    raise exception 'AUTH_REQUIRED';
  end if;
  if p_quantity is null or p_quantity <= 0 or p_quantity > 1000 then
    raise exception 'INVALID_QUANTITY';
  end if;
  if p_unit_price_cents is null or p_unit_price_cents < 0 then
    raise exception 'INVALID_PRICE';
  end if;

  select * into v_sale from public.sales where id = p_sale;
  if not found then
    raise exception 'SALE_NOT_FOUND';
  end if;

  select * into v_day from public.work_days where id = v_sale.work_day_id;

  -- Le vendeur corrige tant que sa journée n'est pas validée ; après ça,
  -- seul l'encadrement peut toucher au chiffre.
  if v_sale.member_id = v_user and v_day.status <> 'validated' then
    null;
  elsif public.is_staff() then
    null;
  else
    raise exception 'FORBIDDEN';
  end if;

  if p_business is not null and not exists (
    select 1 from public.businesses
    where id = p_business and member_id = v_sale.member_id
  ) then
    raise exception 'BUSINESS_NOT_FOUND';
  end if;

  perform pg_advisory_xact_lock(hashtext(v_sale.member_id::text));

  v_diff := p_quantity - v_sale.quantity;

  if v_diff > 0 and public.member_cards_held(v_sale.member_id) < v_diff then
    raise exception 'NOT_ENOUGH_CARDS';
  end if;

  update public.sales
  set quantity = p_quantity,
      unit_price_cents = p_unit_price_cents,
      business_id = p_business,
      notes = nullif(trim(p_notes), '')
  where id = p_sale;

  if v_diff <> 0 then
    insert into public.card_movements
      (kind, quantity, warehouse_delta, member_delta, member_id, sale_id, actor_id, note)
    values ('adjustment', abs(v_diff), 0, -v_diff, v_sale.member_id, p_sale, v_user,
            'Correction de vente');
  end if;

  insert into public.audit_logs (actor_id, action, entity_type, entity_id, metadata)
  values (v_user, 'sale.updated', 'sale', p_sale,
          jsonb_build_object(
            'before', jsonb_build_object('quantity', v_sale.quantity,
                                         'unit_price_cents', v_sale.unit_price_cents),
            'after', jsonb_build_object('quantity', p_quantity,
                                        'unit_price_cents', p_unit_price_cents)));
end;
$$;

-- Suppression d'une vente. Admin seulement : les cartes retournent au membre.
create or replace function public.delete_sale(p_sale uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sale public.sales;
begin
  if not public.is_admin() then
    raise exception 'FORBIDDEN';
  end if;

  select * into v_sale from public.sales where id = p_sale;
  if not found then
    raise exception 'SALE_NOT_FOUND';
  end if;

  insert into public.card_movements
    (kind, quantity, warehouse_delta, member_delta, member_id, actor_id, note)
  values ('adjustment', v_sale.quantity, 0, v_sale.quantity, v_sale.member_id, auth.uid(),
          'Annulation de vente');

  insert into public.audit_logs (actor_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), 'sale.deleted', 'sale', p_sale,
          jsonb_build_object('quantity', v_sale.quantity,
                             'amount_cents', v_sale.amount_cents,
                             'member_id', v_sale.member_id));

  delete from public.sales where id = p_sale;
end;
$$;

-- Commissions ---------------------------------------------------------------

-- Fige la commission due par un membre sur une période et la met en attente
-- de règlement. Le montant vient des ventes, pas d'une saisie manuelle.
create or replace function public.create_commission_payout(
  p_member uuid,
  p_start date,
  p_end date,
  p_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_amount integer;
  v_payout uuid;
begin
  if not public.is_admin() then
    raise exception 'FORBIDDEN';
  end if;
  if p_start is null or p_end is null or p_end < p_start then
    raise exception 'INVALID_PERIOD';
  end if;

  select coalesce(sum(s.commission_cents), 0)::integer into v_amount
  from public.sales s
  join public.work_days d on d.id = s.work_day_id
  where s.member_id = p_member
    and d.work_date between p_start and p_end;

  insert into public.commission_payouts
    (member_id, period_start, period_end, amount_cents, note, created_by)
  values (p_member, p_start, p_end, v_amount, p_note, auth.uid())
  returning id into v_payout;

  insert into public.audit_logs (actor_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), 'commission.created', 'commission_payout', v_payout,
          jsonb_build_object('member_id', p_member, 'amount_cents', v_amount,
                             'period_start', p_start, 'period_end', p_end));

  return v_payout;
end;
$$;

create or replace function public.mark_payout_paid(p_payout uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'FORBIDDEN';
  end if;

  update public.commission_payouts
  set status = 'paid', paid_at = now()
  where id = p_payout and status = 'pending';

  if not found then
    raise exception 'PAYOUT_NOT_FOUND';
  end if;

  insert into public.audit_logs (actor_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), 'commission.paid', 'commission_payout', p_payout, '{}'::jsonb);
end;
$$;

-- Chat ----------------------------------------------------------------------

-- Retourne la conversation privée entre l'appelant et `p_other`, en la
-- créant au besoin. Idempotent : deux personnes qui s'écrivent en même temps
-- tombent sur la même conversation grâce au verrou sur la paire.
create or replace function public.get_or_create_direct_conversation(p_other uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_conv uuid;
begin
  if v_user is null then
    raise exception 'AUTH_REQUIRED';
  end if;
  if p_other = v_user then
    raise exception 'INVALID_TARGET';
  end if;
  if not exists (select 1 from public.profiles where id = p_other and is_active) then
    raise exception 'MEMBER_NOT_FOUND';
  end if;

  perform pg_advisory_xact_lock(
    hashtext(least(v_user::text, p_other::text) || greatest(v_user::text, p_other::text))
  );

  select c.id into v_conv
  from public.conversations c
  join public.conversation_members m1 on m1.conversation_id = c.id and m1.user_id = v_user
  join public.conversation_members m2 on m2.conversation_id = c.id and m2.user_id = p_other
  where c.kind = 'direct'
  limit 1;

  if v_conv is not null then
    return v_conv;
  end if;

  insert into public.conversations (kind, created_by)
  values ('direct', v_user)
  returning id into v_conv;

  insert into public.conversation_members (conversation_id, user_id)
  values (v_conv, v_user), (v_conv, p_other);

  return v_conv;
end;
$$;

-- À chaque message : on remonte la conversation et on prévient les autres.
create or replace function public.handle_new_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_author text;
  v_kind public.conversation_kind;
begin
  update public.conversations
  set last_message_at = new.created_at
  where id = new.conversation_id
  returning kind into v_kind;

  select full_name into v_author from public.profiles where id = new.author_id;

  insert into public.notifications (user_id, kind, title, body, link)
  select m.user_id, 'message',
         case when v_kind = 'team' then 'Équipe · ' || coalesce(v_author, 'Message')
              else coalesce(v_author, 'Message') end,
         left(new.body, 140),
         '/chat/' || new.conversation_id
  from public.conversation_members m
  where m.conversation_id = new.conversation_id
    and m.user_id is distinct from new.author_id;

  return new;
end;
$$;

create trigger on_message_created
  after insert on public.messages
  for each row execute function public.handle_new_message();

-- Droits d'exécution --------------------------------------------------------
--
-- `authenticated` seulement : `anon` (un visiteur sans session) ne peut
-- appeler aucune de ces fonctions, même en devinant leur nom.

revoke all on function public.restock_cards(integer, text, integer) from public, anon;
revoke all on function public.allocate_cards(uuid, integer, text) from public, anon;
revoke all on function public.return_cards(uuid, integer, text) from public, anon;
revoke all on function public.register_card_loss(uuid, integer, text) from public, anon;
revoke all on function public.adjust_stock(integer, text) from public, anon;
revoke all on function public.start_work_day() from public, anon;
revoke all on function public.end_work_day(text) from public, anon;
revoke all on function public.validate_work_day(uuid, integer) from public, anon;
revoke all on function public.record_sale(integer, integer, uuid, text, text, timestamptz) from public, anon;
revoke all on function public.update_sale(uuid, integer, integer, uuid, text) from public, anon;
revoke all on function public.delete_sale(uuid) from public, anon;
revoke all on function public.create_commission_payout(uuid, date, date, text) from public, anon;
revoke all on function public.mark_payout_paid(uuid) from public, anon;
revoke all on function public.get_or_create_direct_conversation(uuid) from public, anon;

grant execute on function public.restock_cards(integer, text, integer) to authenticated;
grant execute on function public.allocate_cards(uuid, integer, text) to authenticated;
grant execute on function public.return_cards(uuid, integer, text) to authenticated;
grant execute on function public.register_card_loss(uuid, integer, text) to authenticated;
grant execute on function public.adjust_stock(integer, text) to authenticated;
grant execute on function public.start_work_day() to authenticated;
grant execute on function public.end_work_day(text) to authenticated;
grant execute on function public.validate_work_day(uuid, integer) to authenticated;
grant execute on function public.record_sale(integer, integer, uuid, text, text, timestamptz) to authenticated;
grant execute on function public.update_sale(uuid, integer, integer, uuid, text) to authenticated;
grant execute on function public.delete_sale(uuid) to authenticated;
grant execute on function public.create_commission_payout(uuid, date, date, text) to authenticated;
grant execute on function public.mark_payout_paid(uuid) to authenticated;
grant execute on function public.get_or_create_direct_conversation(uuid) to authenticated;
