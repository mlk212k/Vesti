import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { netCents, vatCents } from "@/lib/tax";
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
 *  4. La commission porte sur le NET DE TVA, jamais sur l'encaissé brut. Tant
 *     que la franchise s'applique les deux sont égaux et rien ne change ; le
 *     jour où elle ne s'applique plus, payer 30 % de la TVA collectée
 *     reviendrait à payer un partenaire avec de l'argent dû à l'État — puis à
 *     le reverser quand même. C'est réglé ici une fois, pas au cas par cas.
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

  // Du client Stripe au filleul, puis du filleul à son parrain — à condition
  // que ce parrain soit un PARTENAIRE. La règle vit en SQL (0018) plutôt
  // qu'ici : elle décide de qui touche de l'argent, elle mérite d'être
  // vérifiable par un test et de ne pas dépendre d'un appelant qui l'oublie.
  const { data: recipients } = await admin.rpc("commission_recipient", {
    p_customer: params.customerId,
  });

  const recipient = (recipients as { referred_id: string; referrer_id: string }[] | null)?.[0];

  // Aucun destinataire : client sans parrain, ou parrainé par un simple
  // utilisateur. C'est le cas de la grande majorité des factures — le
  // parrainage grand public se récompense en Style, pas en argent.
  if (!recipient) return;

  // Base de la commission : l'encaissé, moins la TVA qui ne nous appartient pas.
  const net = netCents(params.grossCents);

  const { error } = await admin.from("referral_earnings").insert({
    referrer_id: recipient.referrer_id,
    referred_id: recipient.referred_id,
    stripe_id: params.stripeId,
    kind: params.kind,
    // Les trois montants sont conservés : le brut pour rapprocher avec Stripe,
    // le net pour justifier la commission, la TVA pour la déclaration. Les
    // recalculer plus tard donnerait des chiffres faux dès le premier
    // changement de taux.
    gross_cents: params.grossCents,
    net_cents: net,
    vat_cents: vatCents(params.grossCents),
    commission_cents: commissionCents(net),
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
