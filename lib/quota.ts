import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { AnalysisKind, QuotaConsumption, QuotaStatus } from "@/types/db";

/**
 * Consomme un crédit d'analyse. À appeler AVANT tout appel à Claude : c'est le
 * seul rempart contre un utilisateur qui ferait tourner la facture.
 * L'atomicité est assurée côté Postgres (cf. 0003_quota_rpc.sql).
 */
export async function consumeQuota(kind: AnalysisKind): Promise<QuotaConsumption> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("consume_analysis_quota", { p_kind: kind });

  if (error || !data) {
    return {
      allowed: false,
      reason: "no_profile",
      used_count: 0,
      limit_total: 0,
      remaining: 0,
      plan_code: "free",
    };
  }

  return (data as QuotaConsumption[])[0];
}

/** Rend le crédit quand l'analyse échoue après consommation. */
export async function refundQuota(): Promise<void> {
  const supabase = await createClient();
  await supabase.rpc("refund_analysis_quota");
}

export async function getQuotaStatus(): Promise<QuotaStatus | null> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_quota_status");
  return (data as QuotaStatus[] | null)?.[0] ?? null;
}

/** Message affichable pour chaque motif de refus, avec le CTA qui va bien. */
export function quotaRefusalMessage(quota: QuotaConsumption): {
  title: string;
  body: string;
  cta: "upgrade" | "wait" | "login" | null;
} {
  switch (quota.reason) {
    case "quota_exceeded":
      return {
        title: "Tes 3 analyses du mois sont utilisées",
        body: "Passe en Pro pour analyser autant de tenues que tu veux, et garder ta garde-robe.",
        cta: "upgrade",
      };
    case "plan_required":
      return {
        title: "Cette analyse est réservée au Pro",
        body: "L'analyse complète du dressing fait partie du plan Pro.",
        cta: "upgrade",
      };
    case "fair_use_reached":
      return {
        title: "Beaucoup d'analyses ce mois-ci",
        body: "Tu as atteint la limite d'usage raisonnable du plan. Elle se remet à zéro au prochain cycle — écris-nous si tu as besoin de plus.",
        cta: "wait",
      };
    case "unauthenticated":
      return {
        title: "Connecte-toi",
        body: "Ta session a expiré.",
        cta: "login",
      };
    default:
      return {
        title: "Analyse indisponible",
        body: "Réessaie dans un instant.",
        cta: null,
      };
  }
}
