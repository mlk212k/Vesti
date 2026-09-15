// @vitest-environment jsdom

/**
 * Les tests de l'écran de récapitulatif.
 *
 * ⚠️ C'est l'écran le plus tentant à abîmer de toute l'app. Il annonce des
 * sommes à quelqu'un qu'on est en train de convaincre de s'abonner, et chaque
 * garde-fou qu'il porte joue contre la conversion à court terme :
 *
 *  - la mention « d'après toi », qui rappelle que le chiffre sort de ses
 *    curseurs et pas de nos mesures ;
 *  - la ligne de provenance sous chaque nombre, qui invite à le contester ;
 *  - la phrase « on ne te promet pas de récupérer cette somme », qui est
 *    exactement la promesse qu'un argumentaire voudrait faire ;
 *  - la comparaison au prix, qui doit DISPARAÎTRE quand elle nous désavantage.
 *
 * Aucun de ces quatre points ne casse quoi que ce soit en disparaissant. Ils ne
 * tiennent que par ces tests.
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { EMPTY_HABITS, vestiEurPerYear, type Habits } from "@/lib/habits";
import { formatAmount } from "@/lib/plans";
import { HabitsSummary } from "./habits-summary";

afterEach(cleanup);

function show(patch: Partial<Habits>) {
  const onContinue = vi.fn();
  render(
    <HabitsSummary habits={{ ...EMPTY_HABITS, ...patch }} onContinue={onContinue} />
  );
  return { onContinue };
}

/** Le texte de l'écran entier, espaces insécables normalisés. */
function pageText() {
  return document.body.textContent?.replace(/ | /g, " ") ?? "";
}

describe("les chiffres rendus", () => {
  it("le temps déclaré devient des heures par an", () => {
    show({ morning_minutes: 20 });
    expect(screen.getByText("121 h")).toBeDefined();
  });

  it("le budget croisé à la part portée devient des euros gaspillés", () => {
    show({ clothing_budget_eur: 80, worn_out_of_ten: 4 });
    expect(pageText()).toContain("576 €");
  });

  /**
   * ⚠️ Sans cette ligne, « 121 h » se lit comme un relevé fait sur le dos de la
   * personne. Avec elle, c'est une multiplication qu'elle peut refaire — et
   * contester.
   */
  it("chaque chiffre dit de quelle réponse il sort", () => {
    show({ morning_minutes: 20 });
    expect(pageText()).toContain("20 min par matin");
  });

  it("l'écran entier est présenté comme une estimation, pas une mesure", () => {
    show({ morning_minutes: 20 });
    expect(pageText()).toMatch(/d'après tes réponses/i);
  });
});

describe("la comparaison au prix de l'abonnement", () => {
  /**
   * ⚠️ C'est le prix MENSUEL qui est mis en face du gaspillage annuel, et c'est
   * voulu : « 108 € contre 576 € » se comprend sans se ressentir, « 8,99 €
   * contre 576 € » se ressent avant de se comprendre.
   */
  it("met en avant le prix mensuel", () => {
    show({ clothing_budget_eur: 80, worn_out_of_ten: 4 });
    expect(pageText()).toContain(formatAmount("pro"));
  });

  /**
   * ⚠️ Le garde-fou du raccourci ci-dessus. Comparer un prix mensuel à un
   * gaspillage annuel est honnête tant que les DEUX périodes sont nommées, et
   * malhonnête à la seconde où l'une disparaît. « 8,99 € » sans « par mois », ou
   * « 576 € » sans « par an », serait une unité escamotée.
   */
  it("nomme les deux périodes", () => {
    show({ clothing_budget_eur: 80, worn_out_of_ten: 4 });
    expect(pageText()).toMatch(/par mois/);
    expect(pageText()).toMatch(/576 € par an/);
  });

  /**
   * ⚠️ LE test de ce fichier. 10 € par mois dont 9 pièces sur 10 portées font
   * 12 € gaspillés par an, contre 108 € d'abonnement : la comparaison joue
   * CONTRE nous. Elle doit disparaître, pas être retournée.
   */
  it("disparaît quand elle joue contre nous", () => {
    show({ clothing_budget_eur: 10, worn_out_of_ten: 9 });
    expect(pageText()).not.toContain(formatAmount("pro"));
    expect(pageText()).not.toContain(`${vestiEurPerYear()} €`);
  });

  /**
   * ⚠️ « Vesti te fait économiser 576 € » est le slogan évident, et il est faux :
   * on ne contrôle pas ce que la personne achète. Cette phrase est ce qui
   * empêche l'écran de devenir une promesse qu'on ne peut pas tenir.
   */
  it("ne promet jamais de récupérer la somme", () => {
    show({ clothing_budget_eur: 80, worn_out_of_ten: 4 });
    expect(pageText()).toMatch(/on ne te promet pas de récupérer/i);
  });
});

describe("quand il n'y a rien à dire", () => {
  it("sans aucune réponse, l'écran ne fabrique pas de chiffres", () => {
    show({});
    expect(pageText()).not.toMatch(/\d+\s?(h|€)\b/);
    expect(screen.getByRole("button", { name: /continuer/i })).toBeDefined();
  });

  /**
   * Quelqu'un qui répond honnêtement zéro n'a pas le problème qu'on décrit. Lui
   * annoncer « 0 h devant ton armoire » comme une révélation le ferait fermer
   * l'app, et il aurait raison.
   */
  it("des réponses à zéro ne produisent pas de révélation", () => {
    show({ morning_minutes: 0, outfit_changes_per_week: 0, clothing_budget_eur: 0 });
    expect(pageText()).not.toContain("0 h");
  });

  it("on peut toujours continuer l'inscription", () => {
    const { onContinue } = show({});
    screen.getByRole("button", { name: /continuer/i }).click();
    expect(onContinue).toHaveBeenCalled();
  });
});
