// Formes des lignes telles qu'elles sortent de Postgres.
//
// Écrites à la main plutôt que générées : le schéma est stable et court, et
// ça garde le projet sans étape de génération à relancer après chaque
// migration. Si le schéma bouge, ces types sont le premier endroit à suivre.

export type Role = "admin" | "manager" | "member";

export type WorkDayStatus = "in_progress" | "ended" | "validated";

export type MovementKind =
  | "restock"
  | "allocation"
  | "return"
  | "sale"
  | "loss"
  | "adjustment";

export type BusinessStatus = "prospect" | "client" | "callback" | "refused";

export type Profile = {
  id: string;
  full_name: string;
  role: Role;
  phone: string | null;
  avatar_url: string | null;
  daily_goal_override: number | null;
  is_active: boolean;
  created_at: string;
};

export type AppSettings = {
  id: number;
  team_name: string;
  currency: string;
  commission_rate_bp: number;
  default_daily_goal: number;
  default_card_price_cents: number;
  missed_goal_penalty_cents: number;
  updated_at: string;
  updated_by: string | null;
};

export type WorkDayStats = {
  id: string;
  member_id: string;
  work_date: string;
  started_at: string;
  ended_at: string | null;
  status: WorkDayStatus;
  goal_cards: number;
  notes: string | null;
  penalty_cents: number;
  validated_by: string | null;
  validated_at: string | null;
  cards_sold: number;
  sale_count: number;
  revenue_cents: number;
  commission_cents: number;
  net_cents: number;
  net_after_penalty_cents: number;
  goal_reached: boolean;
  cards_missing: number;
  duration_seconds: number;
};

export type MemberCards = {
  member_id: string;
  full_name: string;
  role: Role;
  allocated: number;
  returned: number;
  sold: number;
  lost: number;
  held: number;
};

export type StockSummary = {
  restocked: number;
  allocated: number;
  returned: number;
  sold: number;
  lost: number;
  warehouse_adjustments: number;
  in_warehouse: number;
  held_by_members: number;
};

export type MemberTotals = {
  member_id: string;
  full_name: string;
  role: Role;
  is_active: boolean;
  cards_sold: number;
  revenue_cents: number;
  commission_cents: number;
  net_cents: number;
  sale_count: number;
  last_sale_at: string | null;
};

export type Sale = {
  id: string;
  member_id: string;
  work_day_id: string;
  business_id: string | null;
  quantity: number;
  unit_price_cents: number;
  commission_rate_bp: number;
  amount_cents: number;
  commission_cents: number;
  net_cents: number;
  sold_at: string;
  notes: string | null;
  photo_url: string | null;
  created_at: string;
};

export type Business = {
  id: string;
  member_id: string;
  name: string;
  category: string | null;
  address: string | null;
  city: string | null;
  postal_code: string | null;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  status: BusinessStatus;
  notes: string | null;
  next_action: string | null;
  next_action_at: string | null;
  photo_url: string | null;
  visited_at: string;
  created_at: string;
  updated_at: string;
};

export type CardMovement = {
  id: string;
  kind: MovementKind;
  quantity: number;
  warehouse_delta: number;
  member_delta: number;
  member_id: string | null;
  note: string | null;
  actor_id: string | null;
  created_at: string;
};

export type Notification = {
  id: string;
  user_id: string;
  kind: string;
  title: string;
  body: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
};

export type Conversation = {
  id: string;
  kind: "team" | "direct";
  title: string | null;
  last_message_at: string;
};

export type Message = {
  id: string;
  conversation_id: string;
  author_id: string | null;
  body: string;
  created_at: string;
};

export type AuditLog = {
  id: string;
  actor_id: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type CommissionPayout = {
  id: string;
  member_id: string;
  period_start: string;
  period_end: string;
  amount_cents: number;
  status: "pending" | "paid";
  note: string | null;
  created_at: string;
  paid_at: string | null;
};

// Statut affiché d'une journée. Ce n'est pas le statut stocké : « objectif
// atteint / non atteint » se déduit des ventes, il ne se range pas en base.
export type DisplayDayStatus =
  | "not_started"
  | "in_progress"
  | "goal_reached"
  | "goal_missed"
  | "validated";

export function displayDayStatus(
  day: Pick<WorkDayStats, "status" | "goal_reached"> | null | undefined,
): DisplayDayStatus {
  if (!day) return "not_started";
  if (day.status === "validated") return "validated";
  if (day.status === "in_progress") return "in_progress";
  return day.goal_reached ? "goal_reached" : "goal_missed";
}

export const DAY_STATUS_LABEL: Record<DisplayDayStatus, string> = {
  not_started: "Pas commencé",
  in_progress: "En cours",
  goal_reached: "Objectif atteint",
  goal_missed: "Objectif manqué",
  validated: "Journée validée",
};

export const ROLE_LABEL: Record<Role, string> = {
  admin: "Chef",
  manager: "Manager",
  member: "Commercial",
};

export const BUSINESS_STATUS_LABEL: Record<BusinessStatus, string> = {
  prospect: "Prospect",
  client: "Client",
  callback: "À rappeler",
  refused: "Refus",
};

export const MOVEMENT_LABEL: Record<MovementKind, string> = {
  restock: "Réappro",
  allocation: "Attribution",
  return: "Retour",
  sale: "Vente",
  loss: "Perte",
  adjustment: "Correction",
};
