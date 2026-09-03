import { describe, expect, it, vi, beforeEach } from "vitest";
import type { Garment } from "./schemas";

const createMock = vi.fn();

vi.mock("server-only", () => ({}));
// ⚠️ Ce double doit exporter TOUT ce que find-products importe. Un export
// manquant lève à l'import, l'exception part dans le catch de searchProducts,
// et le test échoue sur « 0 produit » — un symptôme qui ne dit rien de la
// cause. C'est déjà arrivé deux fois : d'abord avec UTILITY_EFFORT, puis avec
// SEARCH_MODEL. Ajouter ici tout nouvel export utilisé par le module testé.
vi.mock("./client", () => ({
  MODEL: "claude-opus-5",
  SEARCH_MODEL: "claude-haiku-4-5",
  UTILITY_EFFORT: "low",
  getClaude: () => ({ messages: { create: createMock } }),
}));

const { findProductMatches } = await import("./find-products");

const garment = {
  category: "chaussures",
  label: "mocassin en cuir noir",
  color: "noir",
  material: "cuir",
  pattern: null,
  fit: null,
  season: "toutes",
  brand: null,
  brand_confidence: "inconnue",
  crop_box: { x: 10, y: 60, width: 30, height: 30 },
  confidence: 88,
  search_terms: ["mocassin cuir noir"],
} satisfies Garment;

function searchBlock(urls: string[]) {
  return {
    type: "web_search_tool_result",
    content: urls.map((url) => ({ type: "web_search_result", url, title: "t" })),
  };
}

function textBlock(payload: unknown) {
  return { type: "text", text: JSON.stringify(payload) };
}

beforeEach(() => createMock.mockReset());

describe("findProductMatches", () => {
  it("garde les produits dont l'URL vient réellement des résultats de recherche", async () => {
    createMock.mockResolvedValue({
      content: [
        searchBlock(["https://boutique.fr/mocassin-noir"]),
        textBlock({
          matches: [
            {
              title: "Mocassin cuir noir",
              merchant: "Boutique",
              url: "https://boutique.fr/mocassin-noir",
              price: "129 €",
            },
          ],
        }),
      ],
    });

    const { matches } = await findProductMatches(garment);
    expect(matches).toHaveLength(1);
    expect(matches[0].url).toBe("https://boutique.fr/mocassin-noir");
  });

  it("rejette une URL inventée absente des résultats de recherche", async () => {
    createMock.mockResolvedValue({
      content: [
        searchBlock(["https://boutique.fr/mocassin-noir"]),
        textBlock({
          matches: [
            // Le modèle passe outre la consigne et fabrique un lien crédible.
            {
              title: "Mocassin Gucci ref. 5578-B",
              merchant: "Gucci",
              url: "https://gucci.com/fr/mocassin-5578b",
              price: "690 €",
            },
          ],
        }),
      ],
    });

    expect((await findProductMatches(garment)).matches).toEqual([]);
  });

  it("ne plante pas quand l'outil de recherche renvoie une erreur", async () => {
    createMock.mockResolvedValue({
      content: [
        // En cas d'erreur, `content` est un objet, pas une liste de résultats.
        { type: "web_search_tool_result", content: { error_code: "max_uses_exceeded" } },
        textBlock({ matches: [{ title: "x", merchant: "y", url: "https://a.fr/x", price: null }] }),
      ],
    });

    expect((await findProductMatches(garment)).matches).toEqual([]);
  });

  it("renvoie une liste vide quand la réponse est inexploitable", async () => {
    // On fait échouer le traitement depuis l'intérieur du code testé (réponse
    // vide → accès impossible à `.content`) plutôt qu'en faisant lever le mock :
    // Vitest intercepte les erreurs levées par un mock et fait échouer le test
    // même lorsque le code les a correctement rattrapées. Le `catch` couvert
    // est le même que sur une panne réseau.
    createMock.mockResolvedValue(null);

    expect((await findProductMatches(garment)).matches).toEqual([]);
  });

  it("tolère du texte autour du JSON", async () => {
    createMock.mockResolvedValue({
      content: [
        searchBlock(["https://boutique.fr/a"]),
        {
          type: "text",
          text: 'Voici :\n{"matches":[{"title":"Mocassin noir","merchant":"Boutique","url":"https://boutique.fr/a","price":null}]}\nVoilà.',
        },
      ],
    });

    const { matches } = await findProductMatches(garment);
    expect(matches).toHaveLength(1);
  });
});
