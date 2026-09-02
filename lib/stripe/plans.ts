import "server-only";

import { getStripe } from "@/lib/stripe/client";

import type { Plan } from "@/lib/plans";

/**
 * Correspondance prix Stripe ↔ plan Vesti.
 *
 * C'est le point de traduction unique entre les deux systèmes : un abonnement
 * arrive de Stripe avec un price_id, et c'est ce mapping qui décide du plan
 * inscrit en base. Un price inconnu retombe volontairement sur `free` plutôt
 * que d'accorder un plan au hasard.
 *
 * ⚠️ La correspondance est portée par des `lookup_key` posées SUR les prix,
 * dans Stripe, et non plus par deux variables d'environnement.
 *
 * Les identifiants de prix se ressemblent à s'y méprendre (`price_1UBDIN…` et
 * `price_1UBDId…` ne diffèrent que d'un caractère au milieu). Les recopier à la
 * main dans deux variables, c'est une inversion tôt ou tard — et elle a eu
 * lieu : un client cliquait « Pro » à 8,99 € et repartait avec un abonnement
 * Styliste à 17,99 €. Une étiquette lisible, posée là où vit le prix, ne peut
 * pas s'inverser en la recopiant, parce qu'on ne la recopie pas.
 */
const LOOKUP_KEYS = {
  pro: "vesti_pro_monthly",
  styliste: "vesti_styliste_monthly",
} as const satisfies Record<Exclude<Plan, "free">, string>;

/**
 * Le catalogue change rarement — jamais en cours de vie d'une instance, en
 * pratique. On le lit une fois et on le garde : sans ça, chaque passage en
 * caisse et chaque webhook paierait un aller-retour réseau pour rien.
 */
let cached: Promise<Record<Exclude<Plan, "free">, string>> | null = null;

async function priceIds(): Promise<Record<Exclude<Plan, "free">, string>> {
  cached ??= (async () => {
    const { data } = await getStripe().prices.list({
      lookup_keys: [LOOKUP_KEYS.pro, LOOKUP_KEYS.styliste],
      active: true,
      limit: 10,
    });

    const find = (key: string) => data.find((price) => price.lookup_key === key)?.id;

    const pro = find(LOOKUP_KEYS.pro);
    const styliste = find(LOOKUP_KEYS.styliste);

    if (!pro || !styliste) {
      // On ne devine pas : un catalogue incomplet doit se voir tout de suite,
      // pas se traduire par une vente au mauvais prix.
      cached = null;
      throw new Error(
        `Prix Stripe introuvables (lookup_key manquante) : ${[
          !pro && LOOKUP_KEYS.pro,
          !styliste && LOOKUP_KEYS.styliste,
        ]
          .filter(Boolean)
          .join(", ")}`
      );
    }

    return { pro, styliste };
  })();

  return cached;
}

export async function planFromPriceId(
  priceId: string | null | undefined
): Promise<Plan> {
  if (!priceId) return "free";

  const ids = await priceIds();
  if (priceId === ids.pro) return "pro";
  if (priceId === ids.styliste) return "styliste";

  // Les variables restent acceptées en secours : un abonnement souscrit avant
  // ce changement porte peut-être encore un ancien identifiant, et le webhook
  // ne doit pas le rétrograder en `free`.
  if (priceId === process.env.STRIPE_PRICE_PRO) return "pro";
  if (priceId === process.env.STRIPE_PRICE_STYLISTE) return "styliste";

  return "free";
}

export async function priceIdForPlan(plan: Exclude<Plan, "free">): Promise<string> {
  return (await priceIds())[plan];
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
