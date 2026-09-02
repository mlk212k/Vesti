import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { COMMISSION_RATE, commissionCents } from "./commission";

/**
 * Inscrit au registre un mouvement d'argent attribuable à un parrain.
 *
 * Appelée depuis le webhook Stripe, sur une facture encaissée ou un
 * remboursement. Trois propriétés à ne pas perdre de vue :
 *
 *  1. Idempotence. Stripe rejoue ses webhooks — plusieurs fois, parfois des
 *     jours plus tard. L'identifiant Stripe est UNIQUE en base et un conflit
 *     n'est pas une erreur : c'est la preuve que le mouvement est déjà compté.
 *  2. Le taux est copié sur la ligne. Une commission due se calcule au taux
 *     promis à l'époque, pas à celui d'aujourd'hui.
 *  3. Silence quand il n'y a pas de parrain. La grande majorité des clients
 *     n'en ont pas ; ce n'est pas un cas d'erreur, c'est le cas normal.
 */
export async function recordReferralEarning(params: {
  customerId: string;
  stripeId: string;
  kind: "invoice" | "refund";
  grossCents: number;
  currency: string;
  occurredAt: Date;
}): Promise<void> {
  if (!Number.isFinite(params.grossCents) || params.grossCents === 0) return;

  const admin = createAdminClient();

  // Du client Stripe au filleul, puis du filleul à son parrain.
  const { data: referred } = await admin
    .from("profiles")
    .select("id, referred_by")
    .eq("stripe_customer_id", params.customerId)
    .maybeSingle<{ id: string; referred_by: string | null }>();

  if (!referred?.referred_by) return;

  const { error } = await admin.from("referral_earnings").insert({
    referrer_id: referred.referred_by,
    referred_id: referred.id,
    stripe_id: params.stripeId,
    kind: params.kind,
    gross_cents: params.grossCents,
    commission_cents: commissionCents(params.grossCents),
    rate: COMMISSION_RATE,
    currency: params.currency.toLowerCase(),
    occurred_at: params.occurredAt.toISOString(),
  });

  // 23505 = violation d'unicité : le webhook a déjà été traité. On sort sans
  // bruit, c'est le comportement attendu d'une livraison rejouée.
  if (error && error.code !== "23505") {
    console.error("[parrainage] commission non enregistrée", error);
  }
}
