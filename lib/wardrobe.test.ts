import { describe, expect, it } from "vitest";
import { missingEssentials, summarizeWardrobe } from "./wardrobe";

const items = (...categories: string[]) => categories.map((category) => ({ category }));

describe("summarizeWardrobe", () => {
  it("compte par catégorie", () => {
    const counts = summarizeWardrobe(items("haut", "haut", "chaussures"));
    expect(counts.find((c) => c.value === "haut")?.count).toBe(2);
    expect(counts.find((c) => c.value === "chaussures")?.count).toBe(1);
  });

  it("rend toutes les catégories, même vides", () => {
    // La page affiche les zéros : « 0 chaussures » est une information, une
    // ligne absente n'en est pas une.
    const counts = summarizeWardrobe([]);
    expect(counts).toHaveLength(6);
    expect(counts.every((c) => c.count === 0)).toBe(true);
  });

  it("garde l'ordre d'affichage, pas celui des données", () => {
    const counts = summarizeWardrobe(items("chaussures", "haut"));
    expect(counts.map((c) => c.value)).toEqual([
      "haut",
      "bas",
      "robe",
      "veste",
      "chaussures",
      "accessoire",
    ]);
  });

  it("ignore une catégorie inconnue plutôt que d'inventer une ligne", () => {
    const counts = summarizeWardrobe(items("chapeau-melon", "haut"));
    expect(counts).toHaveLength(6);
    expect(counts.find((c) => c.value === "haut")?.count).toBe(1);
  });
});

describe("missingEssentials", () => {
  it("signale ce qui empêche de composer une tenue", () => {
    expect(missingEssentials(items("haut"))).toEqual(["un bas", "des chaussures"]);
  });

  it("ne signale rien quand l'essentiel est là", () => {
    expect(missingEssentials(items("haut", "bas", "chaussures"))).toEqual([]);
  });

  it("accepte qu'une robe remplace le haut et le bas", () => {
    // Réclamer un pantalon à quelqu'un qui a des robes et des chaussures
    // serait faux : cette personne peut s'habiller.
    expect(missingEssentials(items("robe", "chaussures"))).toEqual([]);
  });

  it("réclame quand même les chaussures avec une robe", () => {
    expect(missingEssentials(items("robe"))).toEqual(["des chaussures"]);
  });

  it("réclame les trois sur une garde-robe vide", () => {
    expect(missingEssentials([])).toHaveLength(3);
  });

  it("ne compte pas les vestes comme un essentiel", () => {
    // Une veste enrichit une tenue, elle ne la rend pas possible.
    expect(missingEssentials(items("haut", "bas", "chaussures", "veste"))).toEqual([]);
    expect(missingEssentials(items("haut", "bas", "chaussures"))).toEqual([]);
  });
});
