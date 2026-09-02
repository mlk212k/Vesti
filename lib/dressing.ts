import type { DressingAnalysis, DressingGarment, SuggestedOutfit } from "@/lib/claude/schemas";

/**
 * Nettoie une analyse de dressing avant affichage et persistance.
 *
 * Le modèle manipule ici deux jeux d'index : la photo d'où vient chaque pièce,
 * et les pièces qui composent chaque tenue. Rien ne garantit qu'ils pointent
 * quelque part — un index hors bornes casserait la vignette ou afficherait une
 * tenue composée de pièces inexistantes. On filtre plutôt que de faire confiance.
 *
 * Les pièces invalides sont retirées, puis les tenues sont réindexées sur la
 * liste nettoyée ; une tenue qui n'a plus au moins deux pièces disparaît, car
 * elle ne décrit plus rien d'utile.
 */
export function sanitizeDressingAnalysis(
  analysis: DressingAnalysis,
  photoCount: number
): DressingAnalysis {
  const keptIndexes: number[] = [];
  const garments: DressingGarment[] = [];

  analysis.garments.forEach((garment, index) => {
    if (garment.source_index >= 0 && garment.source_index < photoCount) {
      keptIndexes.push(index);
      garments.push(garment);
    }
  });

  // Ancien index → nouvel index après suppression des pièces invalides.
  const remap = new Map(keptIndexes.map((oldIndex, newIndex) => [oldIndex, newIndex]));

  const outfits: SuggestedOutfit[] = [];
  for (const outfit of analysis.outfits) {
    const remapped = outfit.garment_indexes
      .map((index) => remap.get(index))
      .filter((index): index is number => index !== undefined);

    // Dédoublonnage : une même pièce citée deux fois dans une tenue est une
    // erreur du modèle, pas une intention.
    const unique = [...new Set(remapped)];

    if (unique.length >= 2) {
      outfits.push({ ...outfit, garment_indexes: unique });
    }
  }

  return { ...analysis, garments, outfits };
}
