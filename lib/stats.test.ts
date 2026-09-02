import { describe, expect, it } from "vitest";
import { computeScoreTrend, computeTopItems, countByCategory } from "./stats";

function analysis(id: string, score: number | null, day: number) {
  return { id, score, created_at: `2026-03-${String(day).padStart(2, "0")}T10:00:00Z` };
}

describe("computeScoreTrend", () => {
  it("remet les points dans l'ordre chronologique", () => {
    const trend = computeScoreTrend([
      analysis("c", 80, 12),
      analysis("a", 60, 3),
      analysis("b", 70, 7),
    ]);
    expect(trend.points.map((p) => p.id)).toEqual(["a", "b", "c"]);
  });

  it("calcule moyenne et meilleur score", () => {
    const trend = computeScoreTrend([
      analysis("a", 60, 1),
      analysis("b", 70, 2),
      analysis("c", 83, 3),
    ]);
    expect(trend.average).toBe(71);
    expect(trend.best).toBe(83);
  });

  it("ignore les analyses sans score plutôt que de les compter comme zéro", () => {
    const trend = computeScoreTrend([analysis("a", 80, 1), analysis("b", null, 2)]);
    expect(trend.points).toHaveLength(1);
    expect(trend.average).toBe(80);
  });

  it("ne montre aucune tendance tant que l'historique est trop court", () => {
    // Annoncer « +15 » sur trois analyses serait du bruit présenté en signal.
    const trend = computeScoreTrend([
      analysis("a", 50, 1),
      analysis("b", 60, 2),
      analysis("c", 80, 3),
    ]);
    expect(trend.delta).toBeNull();
  });

  it("compare les analyses récentes aux précédentes dès qu'il y en a assez", () => {
    const trend = computeScoreTrend([
      analysis("a", 50, 1),
      analysis("b", 50, 2),
      analysis("c", 70, 3),
      analysis("d", 70, 4),
    ]);
    expect(trend.delta).toBe(20);
  });

  it("gère une garde-robe vide", () => {
    const trend = computeScoreTrend([]);
    expect(trend).toEqual({ points: [], average: null, best: null, delta: null });
  });
});

describe("computeTopItems", () => {
  it("regroupe malgré la casse et les accents", () => {
    const top = computeTopItems([
      { category: "bas", label: "Jean brut" },
      { category: "bas", label: "jean brut" },
      { category: "bas", label: "JEAN BRUT" },
      { category: "haut", label: "Chemise blanche" },
    ]);
    expect(top[0].count).toBe(3);
    expect(top[0].label).toBe("Jean brut");
    expect(top).toHaveLength(2);
  });

  it("classe par fréquence puis par ordre alphabétique", () => {
    const top = computeTopItems([
      { category: "haut", label: "Pull gris" },
      { category: "haut", label: "Blazer noir" },
      { category: "bas", label: "Jean brut" },
      { category: "bas", label: "Jean brut" },
    ]);
    expect(top.map((t) => t.label)).toEqual(["Jean brut", "Blazer noir", "Pull gris"]);
  });

  it("respecte la limite demandée", () => {
    const items = ["a", "b", "c", "d", "e", "f"].map((label) => ({
      category: "haut",
      label,
    }));
    expect(computeTopItems(items, 3)).toHaveLength(3);
  });
});

describe("countByCategory", () => {
  it("compte et trie par volume", () => {
    const counts = countByCategory([
      { category: "haut", label: "a" },
      { category: "chaussures", label: "b" },
      { category: "haut", label: "c" },
    ]);
    expect(counts).toEqual([
      { category: "haut", count: 2 },
      { category: "chaussures", count: 1 },
    ]);
  });
});
