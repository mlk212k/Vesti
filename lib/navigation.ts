/**
 * N'accepte qu'une destination interne pour les redirections post-connexion.
 *
 * Sans ce filtre, `?next=https://evil.tld` ferait de notre domaine un tremplin
 * de phishing (open redirect) : l'utilisateur clique un lien Vesti légitime,
 * s'authentifie, et atterrit sur un site tiers qui imite le nôtre.
 *
 * Les navigateurs traitent `//evil.tld` et `/\evil.tld` comme des URL absolues :
 * les deux formes doivent être rejetées, pas seulement `http(s)://`.
 */
export const DEFAULT_REDIRECT = "/dashboard";

export function safeNext(next: string | null | undefined): string {
  if (!next) return DEFAULT_REDIRECT;
  if (!next.startsWith("/")) return DEFAULT_REDIRECT;
  if (next.startsWith("//") || next.startsWith("/\\")) return DEFAULT_REDIRECT;
  return next;
}

/**
 * Nettoie un code de parrainage venu d'une URL.
 *
 * Reflet du `normalize_referral_code()` SQL : majuscules, sans espaces ni
 * tirets. Un code se recopie depuis une story ou se dicte à voix haute, et
 * arrive donc écrit de dix façons — « lea-10 », « LEA 10 », « Lea10 » sont le
 * même code.
 *
 * ⚠️ La borne de longueur n'est pas cosmétique : cette valeur repart dans le
 * `start_url` du manifeste et dans un cookie. Ce qui n'est pas alphanumérique
 * est jeté, pas échappé — on ne veut rien laisser passer d'autre qu'un code.
 */
export function normalizeReferralCode(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 32);
}
