import "server-only";

import { getClaude, MODEL, VERDICT_EFFORT } from "./client";
import { OUTFIT_ADVICE_SYSTEM_PROMPT } from "./prompts";
import { outfitAdviceSchema, type OutfitAdvicePiece } from "./schemas";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";

export interface AnalysedOutfit {
  score: number | null;
  occasion: string | null;
  verdict: string | null;
  improvements: string[];
}

/**
 * Déduit des tenues déjà analysées ce qu'il manque à la garde-robe.
 *
 * Pas de recherche web ici : cette étape décide QUOI chercher, la recherche des
 * produits vient après. Les séparer coûte un appel de plus, mais évite qu'un
 * modèle occupé à trouver des liens bâcle le diagnostic — et permet de ne payer
 * la recherche que pour des pièces réellement retenues.
 *
 * Une liste vide est un résultat normal : quelqu'un dont les tenues sont déjà
 * bonnes n'a rien à acheter, et lui inventer un manque serait un mauvais
 * conseil doublé d'une dépense inutile.
 */
export async function advisePurchases(
  outfits: AnalysedOutfit[],
  wardrobe: string[]
): Promise<OutfitAdvicePiece[]> {
  if (outfits.length === 0) return [];

  const history = outfits
    .map((outfit, index) => {
      const parts = [
        `Tenue ${index + 1}${outfit.occasion ? ` (${outfit.occasion})` : ""} — score ${outfit.score ?? "?"}/100`,
        outfit.verdict ? `Verdict : ${outfit.verdict}` : null,
        outfit.improvements.length > 0
          ? `À améliorer : ${outfit.improvements.join(" ; ")}`
          : null,
      ].filter(Boolean);
      return parts.join("\n");
    })
    .join("\n\n");

  const inventory =
    wardrobe.length > 0
      ? wardrobe.join(", ")
      : "(garde-robe inconnue : ne suppose pas qu'elle est vide)";

  try {
    const response = await getClaude().messages.parse({
      model: MODEL,
      max_tokens: 2000,
      system: [
        {
          type: "text",
          text: OUTFIT_ADVICE_SYSTEM_PROMPT,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [
        {
          role: "user",
          content: `Ses dernières tenues analysées :\n\n${history}\n\nSa garde-robe : ${inventory}`,
        },
      ],
      output_config: {
        format: zodOutputFormat(outfitAdviceSchema),
        effort: VERDICT_EFFORT,
      },
    });

    return response.parsed_output?.pieces ?? [];
  } catch {
    // Le conseil est un bonus : son échec ne doit pas casser l'onglet Acheter,
    // dont la recherche libre reste utilisable.
    return [];
  }
}
