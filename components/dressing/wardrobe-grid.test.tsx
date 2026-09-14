// @vitest-environment jsdom

/**
 * Les tests de la grille de garde-robe.
 *
 * ⚠️ Ce qu'ils protègent n'est pas une mise en page, c'est une HONNÊTETÉ.
 *
 * La grille affiche, quand elle en a une, la photo d'une fiche produit à la
 * place de la découpe de la photo de l'utilisateur. Or cette photo n'est PAS
 * la pièce de la personne : c'est un article approchant, trouvé par recherche
 * web. Le commentaire de la colonne `product_matches` en base est explicite —
 * « présentés comme pièces similaires, jamais comme la référence exacte ».
 *
 * Si l'étiquette « Similaire » disparaissait d'un refactor, l'app montrerait
 * le vêtement de quelqu'un d'autre en le faisant passer pour le tien, sans
 * qu'aucune erreur ne se déclenche nulle part. D'où ces tests.
 */

import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { WardrobeGrid, type WardrobeItem } from "./wardrobe-grid";

afterEach(cleanup);

const BASE: WardrobeItem = {
  id: "1",
  category: "haut",
  label: "Chemise en lin blanche",
  color: "blanc",
  material: "lin",
  brand: null,
  brand_confidence: null,
  crop_box: null,
  source_image_path: "user/photo.jpg",
  product_matches: [],
  created_at: "2026-09-01T10:00:00Z",
};

const URLS = { "user/photo.jpg": "https://exemple.test/photo.jpg" };

function renderItem(patch: Partial<WardrobeItem>) {
  return render(<WardrobeGrid items={[{ ...BASE, ...patch }]} urls={URLS} />);
}

describe("quelle photo est montrée", () => {
  it("sans produit trouvé : la découpe de la photo de l'utilisateur", () => {
    renderItem({});

    const img = screen.getByAltText("Chemise en lin blanche") as HTMLImageElement;
    expect(img.src).toBe("https://exemple.test/photo.jpg");
    expect(screen.queryByText("Similaire")).toBeNull();
  });

  it("avec photo catalogue : c'est elle qu'on voit, ÉTIQUETÉE", () => {
    renderItem({
      product_matches: [
        {
          title: "Chemise lin",
          merchant: "COS",
          url: "https://cos.test/chemise",
          price: "69 €",
          image: "https://cos.test/chemise.jpg",
        },
      ],
    });

    const img = screen.getByAltText("Pièce similaire à Chemise en lin blanche") as HTMLImageElement;
    expect(img.src).toBe("https://cos.test/chemise.jpg");

    // ⚠️ Le test qui compte : sans cette étiquette, on montre l'article d'un
    // marchand en le faisant passer pour celui de l'utilisateur.
    expect(screen.getByText("Similaire")).toBeDefined();
  });

  /**
   * `fetch-image.ts` rend `null` quand la fiche ne publie pas de photo, mais un
   * enregistrement ancien peut porter une chaîne vide. Les deux doivent
   * retomber sur la découpe plutôt que d'afficher une image cassée.
   */
  it("produit trouvé mais sans photo exploitable : retour à la découpe", () => {
    for (const image of [null, "", "   "] as const) {
      cleanup();
      renderItem({
        product_matches: [
          { title: "T", merchant: "M", url: "https://m.test/p", price: null, image },
        ],
      });
      expect(screen.getByAltText("Chemise en lin blanche")).toBeDefined();
      expect(screen.queryByText("Similaire")).toBeNull();
    }
  });
});

describe("ce que dit la légende", () => {
  it("la marque n'apparaît que si le logo a été LU sur la photo", () => {
    renderItem({ brand: "Uniqlo", brand_confidence: "logo_visible" });
    expect(screen.getByText("Uniqlo")).toBeDefined();
  });

  /** Une marque supposée, imprimée sous une pièce, se lit comme une affirmation. */
  it("une marque seulement supposée n'est pas affichée", () => {
    renderItem({ brand: "Uniqlo", brand_confidence: "suppose" });
    expect(screen.queryByText("Uniqlo")).toBeNull();
  });

  it("le lien nomme le marchand quand la photo est déjà la sienne", () => {
    renderItem({
      product_matches: [
        {
          title: "Chemise lin",
          merchant: "COS",
          url: "https://cos.test/chemise",
          price: null,
          image: "https://cos.test/chemise.jpg",
        },
      ],
    });
    expect(screen.getByText("COS")).toBeDefined();
  });

  it("… et dit « Pièce similaire » quand la photo est la découpe", () => {
    renderItem({
      product_matches: [
        { title: "Chemise lin", merchant: "COS", url: "https://cos.test/c", price: null },
      ],
    });
    expect(screen.getByText("Pièce similaire")).toBeDefined();
  });
});
