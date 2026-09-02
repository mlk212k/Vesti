import "server-only";

import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { getClaude, MODEL, VERDICT_EFFORT } from "./client";
import { DRESSING_SYSTEM_PROMPT, buildDressingUserPrompt } from "./prompts";
import { dressingAnalysisSchema, type DressingAnalysis } from "./schemas";
import { toImageBlock, type ImageInput } from "./images";
import { sanitizeDressingAnalysis } from "@/lib/dressing";
import { OutfitAnalysisRefused, OutfitAnalysisUnparsable } from "./analyze-outfit";
import type { Profile } from "@/types/db";

export interface AnalyzeDressingResult {
  analysis: DressingAnalysis;
  usage: { inputTokens: number; outputTokens: number };
  model: string;
}

type ProfileContext = Pick<
  Profile,
  "gender" | "height_cm" | "weight_kg" | "morphology" | "style_prefs"
>;

/**
 * Analyse plusieurs photos de dressing en un seul appel.
 *
 * Un seul appel et non un par photo : le modèle doit voir l'ensemble pour
 * composer des tenues qui traversent les images (le haut d'une photo avec le bas
 * d'une autre) et repérer ce qui manque à l'échelle du dressing.
 *
 * L'ordre des images porte du sens — c'est lui qui donne `source_index`, donc la
 * photo dans laquelle découper chaque vignette.
 */
export async function analyzeDressing(
  images: ImageInput[],
  profile: ProfileContext
): Promise<AnalyzeDressingResult> {
  const claude = getClaude();

  const response = await claude.messages.parse({
    model: MODEL,
    max_tokens: 16000,
    system: [
      {
        type: "text",
        text: DRESSING_SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [
      {
        role: "user",
        content: [
          ...images.map(toImageBlock),
          { type: "text", text: buildDressingUserPrompt(images.length, profile) },
        ],
      },
    ],
    output_config: {
      format: zodOutputFormat(dressingAnalysisSchema),
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

  return {
    // Les index renvoyés par le modèle ne sont pas fiables par construction :
    // on les valide avant de les laisser toucher l'affichage ou la base.
    analysis: sanitizeDressingAnalysis(parsed, images.length),
    usage: {
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    },
    model: response.model,
  };
}
