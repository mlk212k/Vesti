import "server-only";

import { serverEnv } from "@/lib/env.server";
import type { Plan } from "@/lib/plans";

/**
 * Correspondance prix Stripe ↔ plan Vesti.
 *
 * C'est le point de traduction unique entre les deux systèmes : un abonnement
 * arrive de Stripe avec un price_id, et c'est ce mapping qui décide du plan
 * inscrit en base. Un price inconnu retombe volontairement sur `free` plutôt
 * que d'accorder un plan au hasard.
 */
export function planFromPriceId(priceId: string | null | undefined): Plan {
  if (!priceId) return "free";
  if (priceId === serverEnv.stripePricePro) return "pro";
  if (priceId === serverEnv.stripePriceStyliste) return "styliste";
  return "free";
}

export function priceIdForPlan(plan: Exclude<Plan, "free">): string {
  return plan === "pro" ? serverEnv.stripePricePro : serverEnv.stripePriceStyliste;
}

/**
 * Statuts Stripe qui donnent réellement accès au produit.
 *
 * `past_due` en fait partie volontairement : le paiement a échoué mais Stripe
 * relance encore. Couper l'accès immédiatement ferait fuir des clients qui vont
 * régulariser ; c'est `unpaid`/`canceled` qui coupe.
 */
const ENTITLING_STATUSES = new Set(["active", "trialing", "past_due"]);

export function statusGrantsAccess(status: string): boolean {
  return ENTITLING_STATUSES.has(status);
}
