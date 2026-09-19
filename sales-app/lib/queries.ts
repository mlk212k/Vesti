import "server-only";

import { createClient } from "@/lib/supabase/server";
import { parisToday } from "@/lib/format";
import type {
  Business,
  CardMovement,
  MemberCards,
  MemberTotals,
  Profile,
  Sale,
  StockSummary,
  WorkDayStats,
} from "@/lib/types";

// Toutes les lectures de l'app passent par ce fichier, avec le client porteur
// de la session : la RLS filtre les lignes avant qu'elles n'arrivent ici. Une
// page n'a donc jamais à se demander « est-ce que j'ai le droit de voir ça »
// pour les données — seulement pour l'écran lui-même.

export async function getUnreadCount(): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .is("read_at", null);
  return count ?? 0;
}

export async function getTodayDay(
  memberId: string,
): Promise<WorkDayStats | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("v_work_day_stats")
    .select("*")
    .eq("member_id", memberId)
    .eq("work_date", parisToday())
    .maybeSingle<WorkDayStats>();
  return data ?? null;
}

export async function getOpenDay(
  memberId: string,
): Promise<WorkDayStats | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("v_work_day_stats")
    .select("*")
    .eq("member_id", memberId)
    .eq("status", "in_progress")
    .maybeSingle<WorkDayStats>();
  return data ?? null;
}

export async function getMemberCards(memberId: string): Promise<MemberCards> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("v_member_cards")
    .select("*")
    .eq("member_id", memberId)
    .maybeSingle<MemberCards>();

  return (
    data ?? {
      member_id: memberId,
      full_name: "",
      role: "member",
      allocated: 0,
      returned: 0,
      sold: 0,
      lost: 0,
      held: 0,
    }
  );
}

export async function getStockSummary(): Promise<StockSummary> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("v_stock_summary")
    .select("*")
    .maybeSingle<StockSummary>();

  return (
    data ?? {
      restocked: 0,
      allocated: 0,
      returned: 0,
      sold: 0,
      lost: 0,
      warehouse_adjustments: 0,
      in_warehouse: 0,
      held_by_members: 0,
    }
  );
}

export async function listProfiles(
  options: { activeOnly?: boolean } = {},
): Promise<Profile[]> {
  const supabase = await createClient();
  let query = supabase
    .from("profiles")
    .select("*")
    .order("role")
    .order("full_name");

  if (options.activeOnly) query = query.eq("is_active", true);

  const { data } = await query.returns<Profile[]>();
  return data ?? [];
}

export type TeamRow = {
  profile: Profile;
  day: WorkDayStats | null;
  cards: MemberCards | null;
};

// Vue d'équipe du jour. Trois requêtes à plat plutôt qu'une jointure : les
// vues n'exposent pas de clé étrangère à PostgREST, donc l'assemblage se fait
// ici. C'est trois allers-retours, pas trois cents.
export async function getTeamToday(): Promise<TeamRow[]> {
  const supabase = await createClient();
  const today = parisToday();

  const [profilesRes, daysRes, cardsRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("*")
      .eq("is_active", true)
      .order("full_name")
      .returns<Profile[]>(),
    supabase
      .from("v_work_day_stats")
      .select("*")
      .eq("work_date", today)
      .returns<WorkDayStats[]>(),
    supabase.from("v_member_cards").select("*").returns<MemberCards[]>(),
  ]);

  const days = new Map((daysRes.data ?? []).map((d) => [d.member_id, d]));
  const cards = new Map((cardsRes.data ?? []).map((c) => [c.member_id, c]));

  return (profilesRes.data ?? []).map((profile) => ({
    profile,
    day: days.get(profile.id) ?? null,
    cards: cards.get(profile.id) ?? null,
  }));
}

export async function getMemberTotals(): Promise<MemberTotals[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("v_member_totals")
    .select("*")
    .returns<MemberTotals[]>();
  return data ?? [];
}

export type SaleWithBusiness = Sale & {
  businesses: { id: string; name: string; city: string | null } | null;
};

export async function listSales(options: {
  memberId?: string;
  workDayId?: string;
  businessId?: string;
  from?: string;
  to?: string;
  limit?: number;
}): Promise<SaleWithBusiness[]> {
  const supabase = await createClient();
  let query = supabase
    .from("sales")
    .select("*, businesses(id, name, city)")
    .order("sold_at", { ascending: false })
    .limit(options.limit ?? 50);

  if (options.memberId) query = query.eq("member_id", options.memberId);
  if (options.workDayId) query = query.eq("work_day_id", options.workDayId);
  if (options.businessId) query = query.eq("business_id", options.businessId);
  if (options.from) query = query.gte("sold_at", options.from);
  if (options.to) query = query.lte("sold_at", options.to);

  const { data } = await query.returns<SaleWithBusiness[]>();
  return data ?? [];
}

export async function listBusinesses(options: {
  memberId?: string;
  search?: string;
  limit?: number;
}): Promise<Business[]> {
  const supabase = await createClient();
  let query = supabase
    .from("businesses")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(options.limit ?? 100);

  if (options.memberId) query = query.eq("member_id", options.memberId);
  if (options.search) {
    // `or` + `ilike` : recherche sur le nom OU la ville, insensible à la casse.
    const term = options.search.replace(/[%,()]/g, "");
    query = query.or(`name.ilike.%${term}%,city.ilike.%${term}%`);
  }

  const { data } = await query.returns<Business[]>();
  return data ?? [];
}

export async function getBusiness(id: string): Promise<Business | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("businesses")
    .select("*")
    .eq("id", id)
    .maybeSingle<Business>();
  return data ?? null;
}

export async function listDays(options: {
  memberId?: string;
  from?: string;
  to?: string;
  limit?: number;
}): Promise<WorkDayStats[]> {
  const supabase = await createClient();
  let query = supabase
    .from("v_work_day_stats")
    .select("*")
    .order("work_date", { ascending: false })
    .limit(options.limit ?? 60);

  if (options.memberId) query = query.eq("member_id", options.memberId);
  if (options.from) query = query.gte("work_date", options.from);
  if (options.to) query = query.lte("work_date", options.to);

  const { data } = await query.returns<WorkDayStats[]>();
  return data ?? [];
}

export async function listMovements(options: {
  memberId?: string;
  limit?: number;
}): Promise<CardMovement[]> {
  const supabase = await createClient();
  let query = supabase
    .from("card_movements")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(options.limit ?? 80);

  if (options.memberId) query = query.eq("member_id", options.memberId);

  const { data } = await query.returns<CardMovement[]>();
  return data ?? [];
}

// Agrégats d'une période, pour la page Analytics et les profils.
export type PeriodTotals = {
  revenue_cents: number;
  commission_cents: number;
  net_cents: number;
  cards_sold: number;
  sale_count: number;
  days_worked: number;
  goals_reached: number;
  goals_missed: number;
  worked_seconds: number;
  businesses_visited: number;
};

export async function getPeriodTotals(options: {
  from: string;
  to: string;
  memberId?: string;
}): Promise<PeriodTotals> {
  const supabase = await createClient();

  let daysQuery = supabase
    .from("v_work_day_stats")
    .select("*")
    .gte("work_date", options.from)
    .lte("work_date", options.to);

  let businessQuery = supabase
    .from("businesses")
    .select("id", { count: "exact", head: true })
    .gte("visited_at", `${options.from}T00:00:00`)
    .lte("visited_at", `${options.to}T23:59:59`);

  if (options.memberId) {
    daysQuery = daysQuery.eq("member_id", options.memberId);
    businessQuery = businessQuery.eq("member_id", options.memberId);
  }

  const [daysRes, businessRes] = await Promise.all([
    daysQuery.returns<WorkDayStats[]>(),
    businessQuery,
  ]);

  const days = daysRes.data ?? [];

  return {
    revenue_cents: sum(days, (d) => d.revenue_cents),
    commission_cents: sum(days, (d) => d.commission_cents),
    net_cents: sum(days, (d) => d.net_cents),
    cards_sold: sum(days, (d) => d.cards_sold),
    sale_count: sum(days, (d) => d.sale_count),
    days_worked: days.length,
    goals_reached: days.filter((d) => d.goal_reached).length,
    goals_missed: days.filter((d) => !d.goal_reached && d.status !== "in_progress")
      .length,
    worked_seconds: sum(days, (d) => d.duration_seconds),
    businesses_visited: businessRes.count ?? 0,
  };
}

function sum<T>(items: T[], pick: (item: T) => number): number {
  return items.reduce((total, item) => total + (pick(item) ?? 0), 0);
}
