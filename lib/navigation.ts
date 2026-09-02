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
