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
};
