/**
 * Photo d'un produit, lue sur sa propre page.
 *
 * ⚠️ L'image n'est JAMAIS demandée au modèle. Il sait produire une URL d'image
 * crédible et fausse, exactement comme il sait inventer un lien marchand — et
 * une photo cassée sur une fiche produit fait plus de dégâts qu'une absence de
 * photo. On va donc la chercher sur la page du produit, dans les métadonnées
 * que les sites marchands publient pour les réseaux sociaux (`og:image`).
 *
 * `extractImageUrl` est séparée du réseau pour être testable sur du HTML figé :
 * c'est la partie qui casse quand un site change son gabarit.
 */

/** Balises à essayer dans l'ordre : de la plus fiable à la moins spécifique. */
const META_PATTERNS = [
  /<meta[^>]+property=["']og:image(?::secure_url)?["'][^>]*content=["']([^"']+)["']/i,
  /<meta[^>]+content=["']([^"']+)["'][^>]*property=["']og:image(?::secure_url)?["']/i,
  /<meta[^>]+name=["']twitter:image["'][^>]*content=["']([^"']+)["']/i,
  /<meta[^>]+content=["']([^"']+)["'][^>]*name=["']twitter:image["']/i,
];

/**
 * Extrait l'URL d'image d'une page HTML, résolue en absolu.
 * Renvoie `null` plutôt qu'une valeur douteuse : pas de photo vaut mieux
 * qu'un carré cassé.
 */
export function extractImageUrl(html: string, pageUrl: string): string | null {
  for (const pattern of META_PATTERNS) {
    const found = html.match(pattern)?.[1];
    if (!found) continue;

    const resolved = toAbsoluteHttps(found, pageUrl);
    if (resolved) return resolved;
  }
  return null;
}

/**
 * Absolutise et n'accepte que https.
 *
 * Une image en http sur une page en https est bloquée par le navigateur
 * (contenu mixte) : elle s'afficherait cassée. Autant la refuser ici.
 */
function toAbsoluteHttps(candidate: string, pageUrl: string): string | null {
  const raw = decodeEntities(candidate.trim());
  if (raw.length === 0) return null;

  try {
    const url = new URL(raw, pageUrl);
    if (url.protocol !== "https:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

/** Les attributs HTML transportent souvent `&amp;` dans les URLs signées. */
function decodeEntities(value: string): string {
  return value
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}
