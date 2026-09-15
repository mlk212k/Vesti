// @vitest-environment jsdom

/**
 * Les tests de l'aperçu de verdict.
 *
 * ⚠️ Un seul de ces tests compte vraiment : L'ÉTIQUETTE « EXEMPLE ».
 *
 * Cette vignette affiche un score, un verdict et des remarques qui n'ont été
 * rendus sur la tenue de personne. Elle est posée sur la page de vente, juste
 * au-dessus du bouton d'inscription. Sans la mention qui dit ce qu'elle est,
 * c'est un faux témoignage — un avis fabriqué présenté comme le résultat d'une
 * vraie analyse, à des gens qu'on est en train de convaincre de s'abonner.
 *
 * C'est la même règle que « Similaire » sur les photos catalogue de la
 * garde-robe, et que « d'après toi » sur le récapitulatif des jauges. Elle
 * revient à chaque fois qu'un écran montre quelque chose qui n'a pas été
 * mesuré, et elle se perd toujours de la même façon : quelqu'un trouve la
 * mention encombrante et la retire, l'écran continue de s'afficher, aucune
 * erreur nulle part.
 */

import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { VerdictPreview } from "./verdict-preview";

afterEach(cleanup);

function pageText() {
  return document.body.textContent?.replace(/ | /g, " ") ?? "";
}

describe("l'honnêteté de l'aperçu", () => {
  it("⚠️ dit que c'est un exemple", () => {
    render(<VerdictPreview />);
    expect(pageText()).toMatch(/exemple d'analyse/i);
  });

  /**
   * La mention ne dit pas seulement « exemple », elle dit ce que la personne
   * obtiendra à la place. Sans ça, « exemple » se lit comme un avertissement
   * qui dévalue le produit, au lieu d'une promesse.
   */
  it("… et annonce ce que la personne obtiendra", () => {
    render(<VerdictPreview />);
    expect(pageText()).toMatch(/ta photo/i);
  });

  /**
   * ⚠️ L'étiquette vit DANS la vignette. Détachée, elle se lirait comme une
   * légende de la page entière, et plus comme une mention portée par ce
   * bloc-là — ce qui est précisément la nuance qui la rend honnête.
   */
  it("l'étiquette est à l'intérieur du cadre, pas à côté", () => {
    const { container } = render(<VerdictPreview />);
    const figure = container.querySelector("figure");
    const caption = container.querySelector("figcaption");

    expect(figure).not.toBeNull();
    expect(caption).not.toBeNull();
    expect(figure?.contains(caption as Node)).toBe(true);
  });
});

describe("ce que l'aperçu montre", () => {
  /**
   * Le score est ce qu'on vient voir : c'est lui qui répond à « ça rend quoi,
   * concrètement ? ». Un aperçu sans chiffre ne montre rien.
   */
  it("montre un score sur 100", () => {
    render(<VerdictPreview />);
    expect(screen.getByText("82")).toBeDefined();
    expect(pageText()).toMatch(/sur 100/);
  });

  it("montre les deux registres du vrai verdict", () => {
    render(<VerdictPreview />);
    // Mêmes intitulés que `VerdictCard` : l'aperçu doit ressembler à ce que la
    // personne obtiendra, sinon il promet un autre produit.
    expect(pageText()).toMatch(/ce qui marche/i);
    expect(pageText()).toMatch(/à ajuster/i);
  });

  it("montre l'occasion, qui situe le verdict", () => {
    render(<VerdictPreview />);
    expect(screen.getByText("Soirée")).toBeDefined();
  });
});
