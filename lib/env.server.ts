import "server-only";

/**
 * Secrets serveur. L'import de `server-only` fait ÉCHOUER LE BUILD si un
 * composant client importe ce fichier — c'est la garde qui empêche une clé
 * service_role ou la clé Anthropic de fuir dans le bundle navigateur.
 */

function required(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(`Variable d'environnement serveur manquante : ${name}`);
  }
  return value;
}

export const serverEnv = {
  get supabaseServiceRoleKey(): string {
    return required(process.env.SUPABASE_SERVICE_ROLE_KEY, "SUPABASE_SERVICE_ROLE_KEY");
  },
  get anthropicApiKey(): string {
    return required(process.env.ANTHROPIC_API_KEY, "ANTHROPIC_API_KEY");
  },
  /**
   * Facultatif. N'est nécessaire qu'avec une clé Anthropic « liée à une
   * identité », qui refuse toute requête ne précisant pas dans quel espace de
   * travail elle agit. Une clé de console classique n'en a pas besoin — et lui
   * envoyer cet en-tête à vide la casserait.
   */
  get anthropicWorkspaceId(): string | undefined {
    return process.env.ANTHROPIC_WORKSPACE_ID?.trim() || undefined;
  },
  get stripeSecretKey(): string {
    return required(process.env.STRIPE_SECRET_KEY, "STRIPE_SECRET_KEY");
  },
  get stripeWebhookSecret(): string {
    return required(process.env.STRIPE_WEBHOOK_SECRET, "STRIPE_WEBHOOK_SECRET");
  },
  get stripePricePro(): string {
    return required(process.env.STRIPE_PRICE_PRO, "STRIPE_PRICE_PRO");
  },
  get stripePriceStyliste(): string {
    return required(process.env.STRIPE_PRICE_STYLISTE, "STRIPE_PRICE_STYLISTE");
  },
  /**
   * Configuration du portail client à utiliser (`bpc_…`).
   *
   * Facultative : sans elle, Stripe applique la configuration par défaut du
   * compte. Elle devient nécessaire dès que le compte Stripe sert plusieurs
   * produits — c'est le cas ici — parce que la configuration par défaut est
   * partagée : y déclarer les formules Vesti les proposerait aussi aux clients
   * des autres produits du compte. Une configuration dédiée à Vesti, désignée
   * explicitement, garde chaque portail dans son périmètre.
   */
  get stripePortalConfiguration(): string | undefined {
    return process.env.STRIPE_PORTAL_CONFIGURATION?.trim() || undefined;
  },
};
