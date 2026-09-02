import "server-only";

import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { getClaude, MODEL, VERDICT_EFFORT } from "./client";
import { OUTFIT_SYSTEM_PROMPT, buildOutfitUserPrompt } from "./prompts";
import { outfitAnalysisSchema, type OutfitAnalysis } from "./schemas";
import { toImageBlock, type ImageInput } from "./images";
import type { Profile } from "@/types/db";

export type { ImageInput } from "./images";

export interface AnalyzeOutfitResult {
  analysis: OutfitAnalysis;
  usage: { inputTokens: number; outputTokens: number };
  model: string;
}

type ProfileContext = Pick<
  Profile,
  "gender" | "height_cm" | "weight_kg" | "morphology" | "style_prefs"
>;

/**
 * Analyse une photo de tenue et renvoie le verdict + l'inventaire des pièces.
 *
 * Sortie structurée (`messages.parse` + zod) plutôt que du texte à parser : le
 * verdict comme les fiches de pièces alimentent directement la base, un JSON
 * approximatif casserait l'insertion.
 *
 * La recherche web produit est volontairement un second appel séparé
 * (lib/claude/find-products.ts) : elle n'est pas due à tous les plans et n'a
 * pas à ralentir ni renchérir l'analyse de base.
 */
export async function analyzeOutfit(
  image: ImageInput,
  profile: ProfileContext
): Promise<AnalyzeOutfitResult> {
  const claude = getClaude();

  const response = await claude.messages.parse({
    model: MODEL,
    max_tokens: 8000,
    // Le préfixe système est identique à chaque analyse : on le met en cache,
    // il représente l'essentiel des tokens d'entrée hors image.
    system: [
      {
        type: "text",
        text: OUTFIT_SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [
      {
        role: "user",
        content: [toImageBlock(image), { type: "text", text: buildOutfitUserPrompt(profile) }],
      },
    ],
    output_config: {
      format: zodOutputFormat(outfitAnalysisSchema),
      effort: VERDICT_EFFORT,
    },
  });

  if (response.stop_reason === "refusal") {
    throw new OutfitAnalysisRefused();
  }

  const parsed = response.parsed_output;
  if (!parsed) {
    throw new OutfitAnalysisUnparsable();
  }

  // Photo hors sujet : on refuse AVANT que la route n'enregistre quoi que ce
  // soit. La route rembourse alors le crédit — sans ça, une photo ratée coûtait
  // une analyse et polluait la garde-robe d'une pièce inexistante.
  if (!parsed.analyzable) {
    throw new OutfitAnalysisRefused();
  }

  return {
    analysis: parsed,
    usage: {
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    },
    model: response.model,
  };
}

/** La photo a été refusée par les garde-fous du modèle. */
export class OutfitAnalysisRefused extends Error {
  constructor() {
    super("outfit_analysis_refused");
    this.name = "OutfitAnalysisRefused";
  }
}

/** Réponse illisible malgré la sortie structurée. */
export class OutfitAnalysisUnparsable extends Error {
  constructor() {
    super("outfit_analysis_unparsable");
    this.name = "OutfitAnalysisUnparsable";
  }
}
