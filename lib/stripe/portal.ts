import "server-only";

import { getStripe } from "@/lib/stripe/client";
import { serverEnv } from "@/lib/env.server";
import { env } from "@/lib/env";

/**
 * Ouvre le portail de facturation Stripe pour un client.
 *
 * Passe par ici plutôt que d'appeler Stripe directement : les deux points
 * d'entrée du portail (le bouton « Gérer », et le renvoi depuis le Checkout
 * quand le client est déjà abonné) doivent viser la MÊME configuration. Les
 * laisser diverger donnerait deux portails aux règles différentes selon le
 * chemin emprunté.
 *
 * `configuration` reste facultative : sans elle, Stripe applique celle par
 * défaut du compte.
 */
export async function createPortalSession(customerId: string): Promise<string> {
  const configuration = serverEnv.stripePortalConfiguration;

  const session = await getStripe().billingPortal.sessions.create({
    customer: customerId,
    return_url: `${env.siteUrl}/billing`,
    locale: "fr",
    ...(configuration ? { configuration } : {}),
  });

  return session.url;
}
