import "server-only";

import { getClaude, SEARCH_MODEL, UTILITY_EFFORT } from "./client";
import { PRODUCT_SEARCH_SYSTEM_PROMPT } from "./prompts";
import { productMatchesSchema, type Garment, type ProductMatch } from "./schemas";
import { attachImages } from "@/lib/products/fetch-image";
import { costMicros, WEB_SEARCH_MICROS } from "./pricing";

/**
 * Ce qu'on sait de la personne, pour que la recherche lui corresponde.
 * Tout est facultatif : un profil vide donne une recherche générique, pas une
 * erreur.
 */
/**
 * Ce que la recherche a rendu, ET ce qu'elle a coûté.
 *
 * ⚠️ Le coût fait partie du retour, il n'est pas laissé de côté « pour plus
 * tard ». C'est précisément l'oubli qui a fait croire qu'une analyse Styliste
 * coûtait 0,034 $ alors qu'elle en coûtait dix fois plus : le verdict était
 * mesuré, les recherches ne l'étaient pas, et rien dans le code ne signalait
 * le trou.
 */
export interface SearchResult {
  matches: ProductMatch[];
  costMicros: number;
}

export interface ShopperContext {
  gender?: string | null;
  height_cm?: number | null;
  morphology?: string | null;
  style_prefs?: string[] | null;
}

/** Met le profil en mots, ou renvoie une chaîne vide s'il n'y a rien à dire. */
function describeShopper(context?: ShopperContext): string {
  if (!context) return "";
  const parts = [
    context.gender && context.gender !== "non-precise" ? `rayon ${context.gender}` : null,
    context.height_cm ? `${context.height_cm} cm` : null,
    context.morphology && context.morphology !== "non-precise"
      ? `morphologie ${context.morphology}`
      : null,
    context.style_prefs?.length ? `style ${context.style_prefs.join(", ")}` : null,
  ].filter(Boolean);

  return parts.length > 0 ? `\n\nProfil : ${parts.join(" · ")}.` : "";
}

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
export async function findProductMatches(
  // Volontairement plus étroit que `Garment` : ce sont les seuls champs qui
  // servent, et la recherche différée les relit en base plutôt que de
  // reconstituer une fiche complète.
  garment: Pick<Garment, "label" | "color" | "material" | "search_terms">
): Promise<SearchResult> {
  const query = [garment.label, garment.color, garment.material, ...garment.search_terms]
    .filter(Boolean)
    .join(" ");
  return searchProducts(query);
}

/**
 * Même recherche, à partir d'une description libre — utilisée pour les pièces
 * manquantes du dressing, qui n'ont pas de fiche vêtement derrière elles.
 */
export async function searchProducts(
  query: string,
  context?: ShopperContext
): Promise<SearchResult> {
  const claude = getClaude();

  try {
    const response = await claude.messages.create({
      model: SEARCH_MODEL,
      max_tokens: 2000,
      output_config: { effort: UTILITY_EFFORT },
      system: PRODUCT_SEARCH_SYSTEM_PROMPT,
      tools: [
        {
          type: "web_search_20260209",
          name: "web_search",
          // Plafond dur : chaque recherche est facturée À L'ACTE, et ramène
          // en plus des pages entières dans le contexte — donc elle coûte
          // deux fois. Deux suffisent pour trouver un vêtement précis ; la
          // troisième ne faisait qu'élargir le filet.
          max_uses: 2,
        },
      ],
      messages: [
        {
          role: "user",
          content: `Trouve jusqu'à 3 vêtements achetables correspondant à : ${query}.${describeShopper(context)}\n\nRéponds uniquement par le JSON demandé.`,
        },
      ],
    });

    const allowedUrls = collectSearchResultUrls(response.content);
    const text = extractText(response.content);
    const parsed = parseMatches(text);

    const kept = parsed.filter((match) => allowedUrls.has(normalizeUrl(match.url)));

    // Les recherches web se facturent à l'acte, en plus des tokens : les
    // omettre sous-estimerait le coût de moitié sur un appel court.
    // ⚠️ Tout est lu en optionnel. Une réponse sans `usage` ferait lever
    // l'accès direct, et comme le calcul du coût est DANS le try, l'exception
    // partirait au catch et renverrait une liste vide : on perdrait les
    // produits trouvés pour un problème de comptabilité. La mesure ne doit
    // jamais pouvoir casser ce qu'elle mesure.
    const usage = response.usage as
      | {
          input_tokens?: number | null;
          output_tokens?: number | null;
          server_tool_use?: { web_search_requests?: number };
        }
      | undefined;

    const searches = usage?.server_tool_use?.web_search_requests ?? 0;

    // La photo est lue sur la page du produit, après le filtre : inutile
    // d'aller chercher l'image d'un lien qu'on s'apprête à jeter.
    return {
      matches: await attachImages(kept),
      costMicros:
        costMicros(response.model, usage?.input_tokens, usage?.output_tokens) +
        searches * WEB_SEARCH_MICROS,
    };
  } catch (error) {
    // ⚠️ NE JAMAIS AVALER CETTE ERREUR EN SILENCE.
    //
    // Rendre une liste vide est le bon comportement pour l'utilisateur : la
    // garde-robe reste utilisable sans liens. Mais « aucun résultat » et « la
    // recherche est cassée » se ressemblent trait pour trait à l'écran, et
    // c'est ce qui a laissé passer une panne totale — un modèle incompatible
    // avec l'outil de recherche faisait échouer 100 % des appels, sans une
    // ligne nulle part. Trois fois cette session, ce catch a masqué un vrai
    // défaut.
    console.error("[produits] recherche échouée", error);
    return { matches: [], costMicros: 0 };
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
