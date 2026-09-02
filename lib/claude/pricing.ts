/**
 * Ce que coûte réellement un appel au modèle.
 *
 * Tant que ce fichier n'existait pas, la marge de l'app était une estimation
 * refaite à la main à chaque question. Elle devient une donnée : chaque analyse
 * enregistre son coût, et on peut répondre « ce client m'a coûté X » au lieu de
 * « ça doit tourner autour de X ».
 *
 * ⚠️ Les prix sont en dollars, facturés par million de tokens. Ils sont écrits
 * ici en dur parce qu'ils ne changent qu'à l'occasion d'une décision — pas
 * assez souvent pour justifier un appel réseau, mais assez pour mériter un seul
 * endroit à corriger.
 */
export const MODEL_PRICES: Record<string, { inputPerMTok: number; outputPerMTok: number }> = {
  "claude-opus-5": { inputPerMTok: 5, outputPerMTok: 25 },
  "claude-sonnet-5": { inputPerMTok: 2, outputPerMTok: 10 },
  "claude-haiku-4-5": { inputPerMTok: 1, outputPerMTok: 5 },
};

/** Prix retenu quand le modèle est inconnu : le plus cher qu'on utilise. */
const FALLBACK = MODEL_PRICES["claude-opus-5"];

/**
 * Coût d'un appel, en MICRO-DOLLARS (millionièmes de dollar).
 *
 * Ni en dollars flottants — les erreurs s'accumulent à la sommation — ni en
 * centimes : une analyse coûte quelques centimes, et arrondir au centime
 * perdrait l'essentiel de l'information sur un seul appel.
 */
export function costMicros(
  model: string | null | undefined,
  inputTokens: number | null | undefined,
  outputTokens: number | null | undefined
): number {
  const price = (model && MODEL_PRICES[model]) || FALLBACK;

  // ⚠️ `null` n'est pas zéro. Une réponse d'API où l'un des deux compteurs
  // manque donnerait, converti naïvement, un coût calculé sur la moitié des
  // tokens — donc SOUS-estimé, ce qui est la direction dangereuse : une marge
  // qu'on croit meilleure qu'elle n'est. On rend 0, qui se lit « non mesuré »
  // et se retrouve en base par une simple requête.
  if (inputTokens == null || outputTokens == null) return 0;

  const input = Number(inputTokens);
  const output = Number(outputTokens);

  if (!Number.isFinite(input) || !Number.isFinite(output)) return 0;
  if (input < 0 || output < 0) return 0;

  return Math.round(input * price.inputPerMTok + output * price.outputPerMTok);
}

/** Micro-dollars → texte lisible, pour l'admin. */
export function formatMicros(micros: number): string {
  return `${(micros / 1_000_000).toFixed(4)} $`;
}
