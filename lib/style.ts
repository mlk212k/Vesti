/**
 * Le « Style » — la monnaie du parrainage.
 *
 * Chaque compte a un code personnel. Quand quelqu'un l'enregistre ET fait sa
 * première analyse, le parrain gagne des Style. Le seuil atteint, il les
 * échange contre six mois de Styliste.
 *
 * Les règles vivent en base (migration 0010), pas ici : le solde, le seuil et
 * l'anti-fraude sont appliqués par des fonctions SQL que le navigateur ne peut
 * pas contourner.
 *
 * Ce fichier ne porte QUE les constantes et les types — il est importé par la
 * carte de parrainage, qui tourne dans le navigateur. Les appels à la base
 * sont dans `style.server.ts`, marqué `server-only` : les réunir ici ferait
 * échouer le build au premier import client.
 */

/** Doit rester aligné sur `style_per_referral()` / `style_gift_threshold()`. */
export const STYLE_PER_REFERRAL = 10;
export const STYLE_GIFT_THRESHOLD = 100;
export const STYLE_GIFT_MONTHS = 6;

export type StyleStatus = {
  balance: number;
  code: string | null;
  /** Filleuls ayant fait au moins une analyse — ceux qui ont rapporté. */
  confirmedReferrals: number;
  /** Filleuls inscrits mais qui n'ont encore rien analysé. */
  pendingReferrals: number;
  /** Fin du plan offert en cours, si l'utilisateur en a un. */
  giftUntil: string | null;
  /** L'utilisateur a-t-il déjà été parrainé (le code d'un autre est saisi) ? */
  referred: boolean;
  /** Commissions cumulées, en centimes. Remboursements déduits. */
  earningsCents: number;
  /** Filleuls ayant réellement payé au moins une fois. */
  payingReferrals: number;
};
