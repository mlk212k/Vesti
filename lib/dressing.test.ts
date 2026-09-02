import { describe, expect, it } from "vitest";
import { sanitizeDressingAnalysis } from "./dressing";
import type { DressingAnalysis, DressingGarment } from "@/lib/claude/schemas";

function garment(label: string, sourceIndex: number): DressingGarment {
  return {
    category: "haut",
    label,
    color: "noir",
    material: null,
    pattern: null,
    fit: null,
    season: "toutes",
    brand: null,
    brand_confidence: "inconnue",
    crop_box: { x: 0, y: 0, width: 50, height: 50 },
    confidence: 80,
    search_terms: [label],
    source_index: sourceIndex,
  };
}

function analysis(partial: Partial<DressingAnalysis>): DressingAnalysis {
  return {
    summary: "Un dressing cohérent, dominante neutre.",
    garments: [],
    outfits: [],
    gaps: [],
    ...partial,
  };
}

describe("sanitizeDressingAnalysis", () => {
  it("retire les pièces qui pointent vers une photo inexistante", () => {
    const result = sanitizeDressingAnalysis(
      analysis({
        garments: [garment("chemise", 0), garment("fantôme", 7), garment("pull", 1)],
      }),
      2
    );

    expect(result.garments.map((g) => g.label)).toEqual(["chemise", "pull"]);
  });

  it("réindexe les tenues après suppression d'une pièce", () => {
    // La pièce d'index 1 disparaît : la tenue qui citait 0 et 2 doit désormais
    // citer 0 et 1, sinon elle désignerait la mauvaise pièce.
    const result = sanitizeDressingAnalysis(
      analysis({
        garments: [garment("chemise", 0), garment("fantôme", 9), garment("pantalon", 0)],
        outfits: [
          {
            name: "Bureau",
            garment_indexes: [0, 2],
            occasion: "travail",
            why: "Deux basiques qui se répondent bien.",
          },
        ],
      }),
      1
    );

    expect(result.garments.map((g) => g.label)).toEqual(["chemise", "pantalon"]);
    expect(result.outfits[0].garment_indexes).toEqual([0, 1]);
  });

  it("supprime une tenue qui ne référence que des pièces inexistantes", () => {
    const result = sanitizeDressingAnalysis(
      analysis({
        garments: [garment("chemise", 0)],
        outfits: [
          {
            name: "Imaginaire",
            garment_indexes: [4, 5],
            occasion: "soirée",
            why: "Des pièces que le dressing ne contient pas.",
          },
        ],
      }),
      1
    );

    expect(result.outfits).toEqual([]);
  });

  it("supprime une tenue tombée sous deux pièces", () => {
    const result = sanitizeDressingAnalysis(
      analysis({
        garments: [garment("chemise", 0), garment("fantôme", 8)],
        outfits: [
          {
            name: "Bancale",
            garment_indexes: [0, 1],
            occasion: "week-end",
            why: "Une seule pièce survit au nettoyage.",
          },
        ],
      }),
      1
    );

    expect(result.outfits).toEqual([]);
  });

  it("dédoublonne une pièce citée deux fois dans la même tenue", () => {
    const result = sanitizeDressingAnalysis(
      analysis({
        garments: [garment("chemise", 0), garment("pantalon", 0), garment("veste", 0)],
        outfits: [
          {
            name: "Doublon",
            garment_indexes: [0, 0, 1],
            occasion: "travail",
            why: "Le modèle cite deux fois la même pièce.",
          },
        ],
      }),
      1
    );

    expect(result.outfits[0].garment_indexes).toEqual([0, 1]);
  });

  it("laisse passer une analyse déjà cohérente", () => {
    const input = analysis({
      garments: [garment("chemise", 0), garment("pantalon", 1)],
      outfits: [
        {
          name: "Simple",
          garment_indexes: [0, 1],
          occasion: "quotidien",
          why: "Deux pièces qui vont ensemble.",
        },
      ],
      gaps: [
        {
          item: "Ceinture marron",
          why: "Manque pour lier les cuirs.",
          priority: "moyenne",
          occasion: "travail",
        },
      ],
    });

    expect(sanitizeDressingAnalysis(input, 2)).toEqual(input);
  });
});
