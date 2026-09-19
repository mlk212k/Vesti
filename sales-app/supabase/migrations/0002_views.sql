-- ---------------------------------------------------------------------------
-- Vues de lecture.
--
-- `security_invoker = on` : la vue s'exécute avec les droits de CELUI QUI LA
-- LIT, donc la RLS des tables sous-jacentes s'applique normalement. Sans ce
-- réglage, une vue est un trou béant dans la RLS — elle rendrait les lignes
-- de tout le monde à n'importe qui.
-- ---------------------------------------------------------------------------

-- Cartes par membre ---------------------------------------------------------
-- `held` = ce que la personne a réellement en poche, calculé comme la somme
-- signée de tous ses mouvements. Pas un compteur qu'on incrémente et qui
-- dérive : une somme, donc toujours d'accord avec l'historique.

-- « Vendues » vient de la table des VENTES, pas du grand livre.
--
-- Les deux disent la même chose tant qu'une vente n'est pas corrigée : la
-- correction ajoute un mouvement d'ajustement (le grand livre reste en ajout
-- seul), si bien que compter les mouvements de type « vente » sous-estimerait
-- une vente passée de 2 à 4 cartes. La quantité de la vente, elle, est
-- toujours à jour. `held` reste calculé sur les mouvements : c'est bien la
-- somme signée des entrées et sorties qui dit ce qu'on a en poche.
create view public.v_member_cards
with (security_invoker = on) as
select
  p.id as member_id,
  p.full_name,
  p.role,
  coalesce(sum(m.quantity) filter (where m.kind = 'allocation'), 0)::integer as allocated,
  coalesce(sum(m.quantity) filter (where m.kind = 'return'), 0)::integer as returned,
  coalesce(v.cards_sold, 0)::integer as sold,
  coalesce(sum(m.quantity) filter (where m.kind = 'loss'), 0)::integer as lost,
  coalesce(sum(m.member_delta), 0)::integer as held
from public.profiles p
left join public.card_movements m on m.member_id = p.id
left join lateral (
  select sum(s.quantity) as cards_sold
  from public.sales s
  where s.member_id = p.id
) v on true
group by p.id, p.full_name, p.role, v.cards_sold;

-- Stock global --------------------------------------------------------------

create view public.v_stock_summary
with (security_invoker = on) as
select
  coalesce(sum(quantity) filter (where kind = 'restock'), 0)::integer as restocked,
  coalesce(sum(quantity) filter (where kind = 'allocation'), 0)::integer as allocated,
  coalesce(sum(quantity) filter (where kind = 'return'), 0)::integer as returned,
  -- Même raison que ci-dessus : la vérité des ventes est dans `sales`.
  (select coalesce(sum(quantity), 0) from public.sales)::integer as sold,
  coalesce(sum(quantity) filter (where kind = 'loss'), 0)::integer as lost,
  -- Recomptages d'inventaire, signés : ils font varier le dépôt sans être
  -- ni une entrée d'achat ni une sortie.
  coalesce(sum(warehouse_delta) filter (where kind = 'adjustment'), 0)::integer
    as warehouse_adjustments,
  -- Ce qui reste physiquement au dépôt.
  coalesce(sum(warehouse_delta), 0)::integer as in_warehouse,
  -- Ce qui est en circulation, dans les poches de l'équipe.
  coalesce(sum(member_delta), 0)::integer as held_by_members
from public.card_movements;

-- Journées enrichies --------------------------------------------------------
-- C'est ici que « 8 / 10 · 80 % · objectif non atteint » prend sa source.

create view public.v_work_day_stats
with (security_invoker = on) as
select
  d.id,
  d.member_id,
  d.work_date,
  d.started_at,
  d.ended_at,
  d.status,
  d.goal_cards,
  d.notes,
  d.penalty_cents,
  d.validated_by,
  d.validated_at,
  coalesce(s.cards_sold, 0)::integer as cards_sold,
  coalesce(s.sale_count, 0)::integer as sale_count,
  coalesce(s.revenue_cents, 0)::integer as revenue_cents,
  coalesce(s.commission_cents, 0)::integer as commission_cents,
  coalesce(s.net_cents, 0)::integer as net_cents,
  (coalesce(s.net_cents, 0) - d.penalty_cents)::integer as net_after_penalty_cents,
  coalesce(s.cards_sold, 0) >= d.goal_cards as goal_reached,
  greatest(d.goal_cards - coalesce(s.cards_sold, 0), 0)::integer as cards_missing,
  -- Durée réelle si la journée est finie, durée écoulée si elle tourne encore.
  extract(epoch from (coalesce(d.ended_at, now()) - d.started_at))::integer as duration_seconds
from public.work_days d
left join lateral (
  select
    coalesce(sum(sa.quantity), 0) as cards_sold,
    count(*) as sale_count,
    coalesce(sum(sa.amount_cents), 0) as revenue_cents,
    coalesce(sum(sa.commission_cents), 0) as commission_cents,
    coalesce(sum(sa.net_cents), 0) as net_cents
  from public.sales sa
  where sa.work_day_id = d.id
) s on true;

-- Totaux par membre ---------------------------------------------------------
-- Sert au tableau d'équipe et aux profils. Les filtres de période de la page
-- Analytics, eux, agrègent directement sur `sales` (voir lib/queries.ts).

create view public.v_member_totals
with (security_invoker = on) as
select
  p.id as member_id,
  p.full_name,
  p.role,
  p.is_active,
  coalesce(sum(s.quantity), 0)::integer as cards_sold,
  coalesce(sum(s.amount_cents), 0)::bigint as revenue_cents,
  coalesce(sum(s.commission_cents), 0)::bigint as commission_cents,
  coalesce(sum(s.net_cents), 0)::bigint as net_cents,
  count(s.id)::integer as sale_count,
  max(s.sold_at) as last_sale_at
from public.profiles p
left join public.sales s on s.member_id = p.id
group by p.id, p.full_name, p.role, p.is_active;
