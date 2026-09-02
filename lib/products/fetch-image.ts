import "server-only";

import { extractImageUrl } from "./image";
import type { ProductMatch } from "@/lib/claude/schemas";

/**
 * Va chercher la photo de chaque produit sur sa propre page.
 *
 * Quatre garde-fous, parce qu'on ouvre ici des URL qui viennent d'ailleurs :
 *
 *  1. https uniquement — pas de requête vers un service local ;
 *  2. un délai court, sinon un site lent ferait attendre toute la page ;
 *  3. une taille lue plafonnée : les métadonnées sont dans les premiers
 *     kilo-octets, télécharger la page entière serait payé pour rien ;
 *  4. aucune erreur ne remonte — un produit sans photo reste un produit
 *     utile, et une boutique qui refuse les robots ne doit pas faire échouer
 *     la recherche.
 *
 * Les URL proviennent des résultats de recherche déjà filtrés dans
 * `find-products.ts` : elles ne sont pas saisies par l'utilisateur.
 */
const TIMEOUT_MS = 4000;
const MAX_BYTES = 200_000;

export async function attachImages(matches: ProductMatch[]): Promise<ProductMatch[]> {
  // En parallèle : trois pages en série ajouteraient trois délais bout à bout.
  return Promise.all(
    matches.map(async (match) => ({
      ...match,
      image: await fetchProductImage(match.url),
    }))
  );
}

async function fetchProductImage(pageUrl: string): Promise<string | null> {
  let target: URL;
  try {
    target = new URL(pageUrl);
  } catch {
    return null;
  }
  if (target.protocol !== "https:") return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(target, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        // Certaines boutiques renvoient une page vide sans en-tête crédible.
        "User-Agent": "Mozilla/5.0 (compatible; VestiBot/1.0; +https://vesti.app)",
        Accept: "text/html",
      },
    });

    if (!response.ok) return null;
    if (!response.headers.get("content-type")?.includes("text/html")) return null;

    const html = await readCapped(response);
    return extractImageUrl(html, response.url || target.toString());
  } catch {
    // Délai dépassé, DNS, TLS, robot refusé : pas de photo, c'est tout.
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Lit le début de la réponse et coupe : les métadonnées sont dans le `<head>`. */
async function readCapped(response: Response): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) return "";

  const decoder = new TextDecoder();
  let html = "";
  let read = 0;

  while (read < MAX_BYTES) {
    const { done, value } = await reader.read();
    if (done) break;
    read += value.byteLength;
    html += decoder.decode(value, { stream: true });

    // Tout ce qui nous intéresse est avant la fin du `<head>`.
    if (html.includes("</head>")) break;
  }

  await reader.cancel().catch(() => {});
  return html;
}
