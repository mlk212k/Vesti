import { describe, expect, it } from "vitest";
import { extractImageUrl } from "./image";

const PAGE = "https://boutique.fr/produits/jean-noir";

describe("extractImageUrl", () => {
  it("lit og:image", () => {
    const html = `<meta property="og:image" content="https://cdn.boutique.fr/jean.jpg">`;
    expect(extractImageUrl(html, PAGE)).toBe("https://cdn.boutique.fr/jean.jpg");
  });

  it("accepte les attributs dans l'ordre inverse", () => {
    // Beaucoup de sites écrivent `content` avant `property`.
    const html = `<meta content="https://cdn.boutique.fr/a.jpg" property="og:image"/>`;
    expect(extractImageUrl(html, PAGE)).toBe("https://cdn.boutique.fr/a.jpg");
  });

  it("retombe sur twitter:image quand og:image manque", () => {
    const html = `<meta name="twitter:image" content="https://cdn.boutique.fr/t.jpg">`;
    expect(extractImageUrl(html, PAGE)).toBe("https://cdn.boutique.fr/t.jpg");
  });

  it("résout une URL relative sur la page", () => {
    const html = `<meta property="og:image" content="/img/jean.jpg">`;
    expect(extractImageUrl(html, PAGE)).toBe("https://boutique.fr/img/jean.jpg");
  });

  it("décode les entités des URLs signées", () => {
    // Les CDN signent leurs images : `&amp;` casserait la signature.
    const html = `<meta property="og:image" content="https://cdn.fr/a.jpg?w=800&amp;sig=xyz">`;
    expect(extractImageUrl(html, PAGE)).toBe("https://cdn.fr/a.jpg?w=800&sig=xyz");
  });

  it("refuse une image en http", () => {
    // Sur une page en https, le navigateur bloque le contenu mixte : l'image
    // s'afficherait cassée. Mieux vaut ne rien montrer.
    const html = `<meta property="og:image" content="http://cdn.boutique.fr/jean.jpg">`;
    expect(extractImageUrl(html, PAGE)).toBeNull();
  });

  it("refuse ce qui n'est pas une URL", () => {
    const html = `<meta property="og:image" content="javascript:alert(1)">`;
    expect(extractImageUrl(html, PAGE)).toBeNull();
  });

  it("renvoie null quand la page n'a pas d'image", () => {
    expect(extractImageUrl("<html><body>rien</body></html>", PAGE)).toBeNull();
  });

  it("ignore une balise vide et passe à la suivante", () => {
    const html = `
      <meta property="og:image" content="">
      <meta name="twitter:image" content="https://cdn.boutique.fr/t.jpg">
    `;
    expect(extractImageUrl(html, PAGE)).toBe("https://cdn.boutique.fr/t.jpg");
  });
});
