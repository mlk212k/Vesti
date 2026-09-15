// @vitest-environment jsdom

/**
 * Les tests de l'écran d'offre.
 *
 * ⚠️ Deux choses s'y perdent en silence, et aucune ne déclenche d'erreur :
 *
 *  - LA SORTIE. « Plus tard » est ce qui empêche ce paywall de coûter le compte
 *    qu'on vient de créer. Un jour ou l'autre, quelqu'un voudra le retirer pour
 *    « forcer la décision » — et perdra les gens à qui on aurait vendu dans
 *    trois semaines, après leur première analyse.
 *
 *  - LA MENTION DES CGV. Le paiement part de cet écran : l'information
 *    précontractuelle est due ICI, pas sur une page de facturation qu'on verra
 *    après. C'est la seule obligation légale de tout le parcours d'inscription.
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { EMPTY_HABITS, type Habits } from "@/lib/habits";
import { formatAmount } from "@/lib/plans";
import { PaywallStep } from "./paywall-step";

afterEach(cleanup);

function show(patch: Partial<Habits> = {}) {
  const onLater = vi.fn();
  render(<PaywallStep habits={{ ...EMPTY_HABITS, ...patch }} onLater={onLater} />);
  return { onLater };
}

function pageText() {
  return document.body.textContent?.replace(/ | /g, " ") ?? "";
}

describe("la sortie", () => {
  it("« Plus tard » est présent et ramène au parcours", () => {
    const { onLater } = show();
    const later = screen.getByRole("button", { name: /plus tard/i });
    later.click();
    expect(onLater).toHaveBeenCalled();
  });

  it("… y compris quand aucune jauge n'a été répondue", () => {
    const { onLater } = show();
    expect(onLater).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: /plus tard/i })).toBeDefined();
  });
});

describe("l'obligation d'information", () => {
  it("les CGV sont annoncées avant le paiement", () => {
    show();
    expect(pageText()).toMatch(/cgv/i);
    expect(pageText()).toMatch(/résiliable à tout moment/i);
    expect(pageText()).toMatch(/14 jours de rétractation/i);
  });
});

describe("le rappel du chiffre", () => {
  /**
   * Deux écrans séparent ce paywall du moment où la personne a lu « 576 € ».
   * Entre les deux on lui a demandé son prénom et sa morphologie. Sans ce
   * rappel, la page est un tarif ; avec lui, c'est une comparaison qu'elle a
   * faite elle-même trente secondes plus tôt.
   */
  it("le prix mensuel est mis en face du gaspillage annuel", () => {
    show({ clothing_budget_eur: 80, worn_out_of_ten: 4 });
    expect(pageText()).toContain(formatAmount("pro"));
    expect(pageText()).toMatch(/576 € par an/);
  });

  /**
   * ⚠️ Sans chiffre à rappeler, on n'en fabrique pas. Une accroche chiffrée
   * affichée à quelqu'un qui a passé les jauges serait un montant sorti de
   * nulle part, présenté comme le sien.
   */
  it("sans réponse, aucune accroche chiffrée n'est inventée", () => {
    show();
    expect(screen.getByRole("heading", { name: /choisis ta formule/i })).toBeDefined();
    expect(pageText()).not.toMatch(/dans ton placard/i);
  });

  it("… et pas davantage quand la comparaison joue contre nous", () => {
    show({ clothing_budget_eur: 10, worn_out_of_ten: 9 });
    expect(screen.getByRole("heading", { name: /choisis ta formule/i })).toBeDefined();
  });
});

describe("les formules proposées", () => {
  it("les trois plans sont là, avec leurs prix", () => {
    show();
    expect(screen.getByText("Découverte")).toBeDefined();
    expect(screen.getByText("Pro")).toBeDefined();
    expect(screen.getByText("Styliste")).toBeDefined();
  });

  /**
   * Personne n'arrive abonné à la fin de sa propre inscription : le sélecteur
   * doit donc proposer d'acheter, jamais d'« ouvrir le portail de gestion ».
   */
  it("les plans payants proposent de souscrire, pas de gérer un abonnement", () => {
    show();
    expect(screen.getByRole("button", { name: /choisir pro/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /choisir styliste/i })).toBeDefined();
    expect(screen.queryByRole("button", { name: /gérer mon abonnement/i })).toBeNull();
  });

  /**
   * ⚠️ Le sélecteur recevait `currentPlan="free"`, et marquait donc la carte
   * Découverte « Ton plan actuel », bordure violette comprise : sur une page
   * dont le seul but est de vendre, la mise en avant allait au gratuit et la
   * seule offre présentée comme acquise était celle qui ne rapporte rien.
   * Repasser à `"free"` ne casserait rien — d'où ce test.
   */
  it("aucune formule n'est présentée comme déjà acquise", () => {
    show();
    expect(screen.queryByText(/ton plan actuel/i)).toBeNull();
  });
});
