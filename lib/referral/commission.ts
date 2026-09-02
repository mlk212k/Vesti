/**
 * Calcul de la commission de parrainage.
 *
 * Isolé du reste parce que c'est la seule fonction de l'app qui décide combien
 * d'argent quelqu'un touche. Elle se teste sans base, sans Stripe et sans
 * réseau, et c'est ce qui permet de la vérifier sur les cas tordus plutôt que
 * de la découvrir fausse sur un virement.
 *
 * ⚠️ Deux règles tiennent tout le reste :
 *
 *  1. Tout est en CENTIMES ENTIERS. Un flottant sur de l'argent accumule des
 *     erreurs invisibles qui ressortent à la sommation — 0,1 + 0,2 ne fait pas
 *     0,3 en virgule flottante, et sur mille lignes ça se voit.
 *  2. Le montant d'entrée vient de la facture Stripe, pas d'un prix catalogue.
 *     Un prix affiché ignore les remises, les mois partiels et les impayés.
 */

/** Taux en vigueur. Doit rester aligné sur `referral_commission_rate()` en SQL. */
export const COMMISSION_RATE = 0.3;

/**
 * Commission due sur un encaissement, en centimes.
 *
 * L'arrondi est au plus proche, et le demi monte. Choisi plutôt que tronquer
 * parce que tronquer systématiquement en défaveur du parrain finit par se voir
 * — et par se raconter. Sur un encaissement à 8,99 €, 30 % font 269,7 centimes,
 * donc 270.
 *
 * Un remboursement arrive en négatif et ressort en négatif : la commission
 * s'annule dans le même sens que l'encaissement.
 */
export function commissionCents(grossCents: number, rate = COMMISSION_RATE): number {
  if (!Number.isFinite(grossCents) || !Number.isFinite(rate)) return 0;

  // `Math.round` arrondit -0.5 vers zéro, ce qui ferait diverger un
  // remboursement de l'encaissement qu'il annule. On calcule donc sur la valeur
  // absolue et on rend le signe ensuite.
  const sign = grossCents < 0 ? -1 : 1;
  return sign * Math.round(Math.abs(grossCents) * rate);
}

/** Met un montant en centimes sous la forme qu'on affiche : « 2,70 € ». */
export function formatCents(cents: number, currency = "EUR"): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency,
  }).format(cents / 100);
}
