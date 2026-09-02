import "server-only";

import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { getClaude, MODEL } from "./client";
import { dailyOutfitSchema, type DailyOutfit } from "./schemas";
import { summarize, weatherConstraints, type WeatherSnapshot } from "@/lib/weather";

export interface WardrobePiece {
  id: string;
  category: string;
  label: string;
  color: string | null;
  material: string | null;
  season: string | null;
}

const SYSTEM_PROMPT = `Tu es le styliste personnel de Vesti. On te donne la garde-robe réelle d'une personne, la météo du jour et l'occasion. Tu composes UNE tenue.

Règles strictes :
- Tu ne peux utiliser QUE les pièces de la liste fournie, désignées par leur identifiant exact. Ne propose jamais un vêtement absent de la liste : la personne ne l'a pas.
- La tenue doit être cohérente : un haut, un bas (ou une robe), des chaussures. Ajoute une veste ou un accessoire si le temps ou l'occasion le demandent.
- Tiens compte de la météo avant l'esthétique : une belle tenue trempée ou glaciale est ratée.
- "advice" : explique en deux ou trois phrases pourquoi cette tenue marche aujourd'hui, en parlant du temps et de l'occasion. Tutoie, ton direct et chaleureux.
- "missing" : si la garde-robe ne contient pas ce qu'il faudrait vraiment pour ce temps (pas de manteau alors qu'il gèle, pas de chaussures fermées sous la pluie), dis-le en une phrase. Sinon null.
- Tu juges des vêtements, jamais le corps de la personne.`;

/**
 * Compose la tenue du jour à partir de ce que la personne possède.
 *
 * Le modèle reçoit des identifiants et doit les rendre tels quels : on vérifie
 * ensuite que chacun existe (cf. l'appelant). Une tenue est inutile si elle
 * contient un vêtement que la personne n'a pas.
 */
export async function suggestDailyOutfit(
  pieces: WardrobePiece[],
  weather: WeatherSnapshot,
  occasion: string
): Promise<{ outfit: DailyOutfit; model: string; usage: { inputTokens: number; outputTokens: number } }> {
  const claude = getClaude();

  const inventory = pieces
    .map(
      (piece) =>
        `- id:${piece.id} | ${piece.category} | ${piece.label}` +
        `${piece.color ? ` | ${piece.color}` : ""}` +
        `${piece.material ? ` | ${piece.material}` : ""}` +
        `${piece.season && piece.season !== "toutes" ? ` | saison: ${piece.season}` : ""}`
    )
    .join("\n");

  const constraints = weatherConstraints(weather);
  const constraintLines =
    constraints.length > 0
      ? `\nContraintes du jour :\n${constraints.map((c) => `- ${c}`).join("\n")}`
      : "";

  const response = await claude.messages.parse({
    model: MODEL,
    max_tokens: 2000,
    system: [
      { type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } },
    ],
    messages: [
      {
        role: "user",
        content: `Météo : ${summarize(weather)}, de ${Math.round(weather.minTemperature)}°C à ${Math.round(weather.maxTemperature)}°C, ${weather.precipitationProbability}% de risque de précipitations, vent ${Math.round(weather.windSpeed)} km/h.${constraintLines}

Occasion : ${occasion}.

Ma garde-robe :
${inventory}

Compose-moi une tenue pour aujourd'hui.`,
      },
    ],
    output_config: { format: zodOutputFormat(dailyOutfitSchema) },
  });

  const parsed = response.parsed_output;
  if (!parsed) {
    throw new Error("daily_outfit_unparsable");
  }

  return {
    outfit: parsed,
    model: response.model,
    usage: {
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    },
  };
}

/**
 * Ne garde que les pièces réellement présentes dans la garde-robe.
 *
 * Même consigne explicite, un modèle peut renvoyer un identifiant inventé ou
 * légèrement déformé. Afficher une tenue contenant un vêtement que la personne
 * n'a pas ruinerait la confiance dans tout le produit.
 */
export function keepOwnedPieces(itemIds: string[], pieces: WardrobePiece[]): WardrobePiece[] {
  const byId = new Map(pieces.map((piece) => [piece.id, piece]));
  const seen = new Set<string>();
  const kept: WardrobePiece[] = [];

  for (const id of itemIds) {
    const piece = byId.get(id);
    if (piece && !seen.has(id)) {
      seen.add(id);
      kept.push(piece);
    }
  }

  return kept;
}
