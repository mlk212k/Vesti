/**
 * Lecture d'ensemble d'une garde-robe.
 *
 * Une grille de vignettes montre ce qu'on possède ; elle ne dit rien de ce
 * qu'on peut en faire. Ces deux fonctions donnent à la page la seule chose
 * qu'une grille ne donne pas : où en est la garde-robe, et ce qui lui manque
 * pour composer des tenues complètes.
 */

/** Ordre d'affichage : celui dans lequel on s'habille, du haut vers le bas. */
export const WARDROBE_CATEGORIES = [
  { value: "haut", label: "Hauts" },
  { value: "bas", label: "Bas" },
  { value: "robe", label: "Robes" },
  { value: "veste", label: "Vestes" },
  { value: "chaussures", label: "Chaussures" },
  { value: "accessoire", label: "Accessoires" },
] as const;

/**
 * Les catégories sans lesquelles aucune tenue complète n'est possible.
 *
 * Les robes n'en font pas partie et ne sont pas non plus une lacune : elles
 * remplacent haut + bas. C'est pour ça que `missingEssentials` les traite comme
 * une alternative et non comme une septième case à cocher.
 */
const ESSENTIALS = ["haut", "bas", "chaussures"] as const;

export type CategoryCount = { value: string; label: string; count: number };

/** Compte les pièces par catégorie, dans l'ordre d'affichage. */
export function summarizeWardrobe(
  items: { category: string }[]
): CategoryCount[] {
  const counts = new Map<string, number>();
  for (const item of items) {
    counts.set(item.category, (counts.get(item.category) ?? 0) + 1);
  }

  return WARDROBE_CATEGORIES.map((category) => ({
    value: category.value,
    label: category.label,
    count: counts.get(category.value) ?? 0,
  }));
}

/**
 * Les essentiels absents, en minuscules, prêts à être mis dans une phrase.
 *
 * Une robe couvre le haut et le bas : quelqu'un qui n'a que des robes et des
 * chaussures peut s'habiller, et lui réclamer un pantalon serait faux.
 */
export function missingEssentials(items: { category: string }[]): string[] {
  const present = new Set(items.map((item) => item.category));
  const hasDress = present.has("robe");

  return ESSENTIALS.filter((essential) => {
    if (present.has(essential)) return false;
    if (hasDress && (essential === "haut" || essential === "bas")) return false;
    return true;
  }).map((essential) =>
    essential === "haut" ? "un haut" : essential === "bas" ? "un bas" : "des chaussures"
  );
}
