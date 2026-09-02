import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("./client", () => ({
  MODEL: "claude-opus-5",
  VERDICT_EFFORT: "medium",
  getClaude: () => ({}),
}));

const { keepOwnedPieces } = await import("./suggest-daily");

const pieces = [
  { id: "a1", category: "haut", label: "Chemise blanche", color: null, material: null, season: null },
  { id: "b2", category: "bas", label: "Jean brut", color: null, material: null, season: null },
  { id: "c3", category: "chaussures", label: "Bottines", color: null, material: null, season: null },
];

describe("keepOwnedPieces", () => {
  it("garde les pièces possédées, dans l'ordre proposé", () => {
    expect(keepOwnedPieces(["b2", "a1"], pieces).map((p) => p.id)).toEqual(["b2", "a1"]);
  });

  it("écarte un identifiant inventé", () => {
    // Une tenue contenant un vêtement que la personne n'a pas ruinerait la
    // confiance dans tout le produit.
    expect(keepOwnedPieces(["a1", "zz9"], pieces).map((p) => p.id)).toEqual(["a1"]);
  });

  it("ne compte pas deux fois la même pièce", () => {
    expect(keepOwnedPieces(["a1", "a1", "b2"], pieces).map((p) => p.id)).toEqual(["a1", "b2"]);
  });

  it("renvoie une liste vide si rien ne correspond", () => {
    expect(keepOwnedPieces(["x", "y"], pieces)).toEqual([]);
  });
});
