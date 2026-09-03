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
  const configuration = await usableConfiguration();

  const session = await getStripe().billingPortal.sessions.create({
    customer: customerId,
    return_url: `${env.siteUrl}/billing`,
    locale: "fr",
    ...(configuration ? { configuration } : {}),
  });

  return session.url;
}

/** Une configuration se lit une fois : elle ne change pas d'une session à l'autre. */
let checked: { id: string | undefined; ok: boolean } | null = null;

/**
 * La configuration retenue, à condition qu'elle laisse RÉSILIER.
 *
 * ⚠️ Constaté en production : la configuration visée avait la résiliation, les
 * factures et le changement de moyen de paiement tous désactivés. L'abonné
 * arrivait sur une page où il ne pouvait rien faire — pas même partir.
 *
 * Ce n'est pas qu'un défaut d'ergonomie. Un abonnement doit pouvoir être résilié
 * aussi simplement qu'il a été souscrit ; une page qui l'en empêche transforme
 * un désabonnement en litige bancaire, ce qui coûte bien plus cher qu'un client
 * perdu.
 *
 * Plutôt que de faire confiance à une variable d'environnement, on vérifie. Si
 * la configuration n'autorise pas la résiliation, on l'ignore : Stripe applique
 * alors celle par défaut du compte, qui l'autorise.
 */
async function usableConfiguration(): Promise<string | undefined> {
  const id = serverEnv.stripePortalConfiguration;
  if (!id) return undefined;
  if (checked?.id === id) return checked.ok ? id : undefined;

  try {
    const configuration = await getStripe().billingPortal.configurations.retrieve(id);
    const ok = Boolean(configuration.features?.subscription_cancel?.enabled);

    if (!ok) {
      console.error(
        `[stripe] la configuration de portail ${id} n'autorise pas la résiliation — ` +
          "on retombe sur celle par défaut du compte. Active « Annuler les " +
          "abonnements » dans le portail client Stripe."
      );
    }

    checked = { id, ok };
    return ok ? id : undefined;
  } catch {
    // Configuration illisible (supprimée, mauvais identifiant) : le défaut du
    // compte vaut mieux qu'une session qui échoue.
    checked = { id, ok: false };
    return undefined;
  }
}
