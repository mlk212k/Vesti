import "server-only";

import { getClaude, MODEL, UTILITY_EFFORT } from "./client";
import { PRODUCT_SEARCH_SYSTEM_PROMPT } from "./prompts";
import { productMatchesSchema, type Garment, type ProductMatch } from "./schemas";

/**
 * Cherche des produits réels correspondant à une pièce détectée.
 *
 * Deux garde-fous, parce qu'un modèle sait produire une URL marchande crédible
 * et fausse :
 *  1. le prompt lui interdit de répondre de mémoire ;
 *  2. surtout, on ne conserve que les URL effectivement présentes dans les
 *     résultats de l'outil de recherche. Un lien "halluciné" ne survit pas au
 *     filtre, même si le modèle passe outre la consigne.
 *
 * En cas d'échec on renvoie une liste vide : aucune suggestion vaut mieux
 * qu'une suggestion inventée.
 */
export async function findProductMatches(garment: Garment): Promise<ProductMatch[]> {
  const query = [garment.label, garment.color, garment.material, ...garment.search_terms]
    .filter(Boolean)
    .join(" ");
  return searchProducts(query);
}

/**
 * Même recherche, à partir d'une description libre — utilisée pour les pièces
 * manquantes du dressing, qui n'ont pas de fiche vêtement derrière elles.
 */
export async function searchProducts(query: string): Promise<ProductMatch[]> {
  const claude = getClaude();

  try {
    const response = await claude.messages.create({
      model: MODEL,
      max_tokens: 2000,
      output_config: { effort: UTILITY_EFFORT },
      system: PRODUCT_SEARCH_SYSTEM_PROMPT,
      tools: [
        {
          type: "web_search_20260209",
          name: "web_search",
          // Plafond dur : la recherche web est facturée à l'usage, et une pièce
          // ne justifie pas une exploration illimitée.
          max_uses: 3,
        },
      ],
      messages: [
        {
          role: "user",
          content: `Trouve jusqu'à 3 vêtements achetables correspondant à : ${query}. Réponds uniquement par le JSON demandé.`,
        },
      ],
    });

    const allowedUrls = collectSearchResultUrls(response.content);
    const text = extractText(response.content);
    const parsed = parseMatches(text);

    return parsed.filter((match) => allowedUrls.has(normalizeUrl(match.url)));
  } catch {
    // Recherche indisponible : la garde-robe reste utilisable sans liens.
    return [];
  }
}

/** URLs réellement renvoyées par l'outil de recherche. */
function collectSearchResultUrls(content: unknown[]): Set<string> {
  const urls = new Set<string>();

  for (const block of content) {
    if (
      typeof block !== "object" ||
      block === null ||
      (block as { type?: string }).type !== "web_search_tool_result"
    ) {
      continue;
    }

    // En cas d'erreur de l'outil, `content` est un objet d'erreur et non une
    // liste de résultats : on ne peut pas l'itérer aveuglément.
    const results = (block as { content?: unknown }).content;
    if (!Array.isArray(results)) continue;

    for (const result of results) {
      const url = (result as { url?: unknown }).url;
      if (typeof url === "string") urls.add(normalizeUrl(url));
    }
  }

  return urls;
}

function extractText(content: unknown[]): string {
  return content
    .filter(
      (block): block is { type: "text"; text: string } =>
        typeof block === "object" &&
        block !== null &&
        (block as { type?: string }).type === "text"
    )
    .map((block) => block.text)
    .join("\n");
}

function parseMatches(text: string): ProductMatch[] {
  // Le modèle peut encadrer le JSON de texte malgré la consigne.
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) return [];

  try {
    const raw = JSON.parse(text.slice(start, end + 1));
    const parsed = productMatchesSchema.safeParse(raw);
    return parsed.success ? parsed.data.matches : [];
  } catch {
    return [];
  }
}

function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.hash = "";
    return parsed.toString().replace(/\/$/, "");
  } catch {
    return url;
  }
}
