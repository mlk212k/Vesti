import { PLANS, type Plan } from "@/lib/plans";

/**
 * Agrégats du back-office. Fonctions pures : elles reçoivent les lignes lues en
 * base et calculent, sans requête ni date implicite — ce qui les rend testables.
 */

export interface ProfileRow {
  plan: Plan;
  created_at: string;
  referral_code: string | null;
}

export interface AnalysisRow {
  created_at: string;
  input_tokens: number | null;
  output_tokens: number | null;
}

/** Tarifs API Claude Opus 5, en dollars par million de tokens. */
const INPUT_COST_PER_MTOK = 5;
const OUTPUT_COST_PER_MTOK = 25;

export interface Overview {
  signups: number;
  signups7d: number;
  signups30d: number;
  byPlan: Record<Plan, number>;
  payingCustomers: number;
  /** Revenu mensuel récurrent, en euros. */
  mrr: number;
  conversionRate: number;
}

export function computeOverview(profiles: ProfileRow[], now: Date): Overview {
  const day = 24 * 60 * 60 * 1000;
  const since = (days: number) =>
    profiles.filter((p) => now.getTime() - new Date(p.created_at).getTime() <= days * day)
      .length;

  const byPlan: Record<Plan, number> = { free: 0, pro: 0, styliste: 0 };
  for (const profile of profiles) {
    if (profile.plan in byPlan) byPlan[profile.plan] += 1;
  }

  const payingCustomers = byPlan.pro + byPlan.styliste;
  const mrr = byPlan.pro * PLANS.pro.priceEur + byPlan.styliste * PLANS.styliste.priceEur;

  return {
    signups: profiles.length,
    signups7d: since(7),
    signups30d: since(30),
    byPlan,
    payingCustomers,
    mrr: Math.round(mrr * 100) / 100,
    conversionRate:
      profiles.length === 0
        ? 0
        : Math.round((payingCustomers / profiles.length) * 1000) / 10,
  };
}

export interface UsageStats {
  analyses: number;
  analyses30d: number;
  inputTokens: number;
  outputTokens: number;
  /** Coût cumulé estimé, en dollars. */
  estimatedCost: number;
  costPerAnalysis: number;
}

/**
 * Coût du modèle, estimé à partir des tokens enregistrés à chaque analyse.
 *
 * C'est l'indicateur qui dit si la marge tient : le plan Pro n'est rentable que
 * tant que le coût par client reste loin de son prix.
 */
export function computeUsage(analyses: AnalysisRow[], now: Date): UsageStats {
  const day = 24 * 60 * 60 * 1000;
  const inputTokens = analyses.reduce((sum, a) => sum + (a.input_tokens ?? 0), 0);
  const outputTokens = analyses.reduce((sum, a) => sum + (a.output_tokens ?? 0), 0);

  const estimatedCost =
    (inputTokens / 1_000_000) * INPUT_COST_PER_MTOK +
    (outputTokens / 1_000_000) * OUTPUT_COST_PER_MTOK;

  return {
    analyses: analyses.length,
    analyses30d: analyses.filter(
      (a) => now.getTime() - new Date(a.created_at).getTime() <= 30 * day
    ).length,
    inputTokens,
    outputTokens,
    estimatedCost: Math.round(estimatedCost * 100) / 100,
    costPerAnalysis:
      analyses.length === 0
        ? 0
        : Math.round((estimatedCost / analyses.length) * 1000) / 1000,
  };
}
