import { describe, expect, it } from "vitest";
import { costMicros, formatMicros } from "./pricing";

describe("costMicros", () => {
  it("chiffre une analyse réelle", () => {
    // Relevé en base : 4 958 tokens d'entrée, 1 867 de sortie sur Opus 5.
    // 4958×5 + 1867×25 = 24 790 + 46 675 = 71 465 micro-dollars, soit 0,0715 $.
    expect(costMicros("claude-opus-5", 4958, 1867)).toBe(71_465);
  });

  it("applique le tarif du modèle utilisé", () => {
    // Sonnet 5 est 2,5× moins cher : le même appel doit le refléter.
    expect(costMicros("claude-sonnet-5", 1_000_000, 0)).toBe(2_000_000);
    expect(costMicros("claude-opus-5", 1_000_000, 0)).toBe(5_000_000);
  });

  it("facture la sortie plus cher que l'entrée", () => {
    // C'est ce qui rend l'effort de réflexion coûteux : il produit des tokens
    // de sortie, les plus chers.
    expect(costMicros("claude-opus-5", 0, 1000)).toBeGreaterThan(
      costMicros("claude-opus-5", 1000, 0)
    );
  });

  it("prend le tarif le plus cher pour un modèle inconnu", () => {
    // Sous-estimer un coût inconnu ferait croire à une marge qui n'existe pas.
    expect(costMicros("modele-inconnu", 1_000_000, 0)).toBe(
      costMicros("claude-opus-5", 1_000_000, 0)
    );
    expect(costMicros(null, 1_000_000, 0)).toBe(5_000_000);
  });

  it("rend zéro plutôt qu'un nombre absurde", () => {
    // Une réponse d'API incomplète ne doit pas écrire NaN dans une colonne qui
    // sert à calculer une marge.
    expect(costMicros("claude-opus-5", null, 10)).toBe(0);
    expect(costMicros("claude-opus-5", Number.NaN, 10)).toBe(0);
    expect(costMicros("claude-opus-5", -5, 10)).toBe(0);
  });

  it("rend toujours un entier", () => {
    expect(Number.isInteger(costMicros("claude-opus-5", 3361, 1273))).toBe(true);
  });
});

describe("formatMicros", () => {
  it("affiche en dollars avec quatre décimales", () => {
    // Deux décimales arrondiraient une analyse à 0,07 $ et perdraient la
    // différence entre deux réglages qu'on cherche justement à comparer.
    expect(formatMicros(71_465)).toBe("0.0715 $");
    expect(formatMicros(0)).toBe("0.0000 $");
  });
});
