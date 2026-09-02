import { describe, expect, it } from "vitest";
import { COMMISSION_RATE, commissionCents, formatCents } from "./commission";

describe("commissionCents", () => {
  it("prend 30 % des vrais tarifs", () => {
    // 8,99 € → 269,7 centimes, arrondi à 270. 17,99 € → 539,7 → 540.
    expect(commissionCents(899)).toBe(270);
    expect(commissionCents(1799)).toBe(540);
  });

  it("arrondit au plus proche, le demi vers le haut", () => {
    // Tronquer systématiquement en défaveur du parrain finit par se voir.
    expect(commissionCents(5)).toBe(2); // 1,5 → 2
    expect(commissionCents(15)).toBe(5); // 4,5 → 5
  });

  it("rend un entier, jamais une fraction de centime", () => {
    for (const gross of [1, 7, 99, 333, 1234, 99999]) {
      expect(Number.isInteger(commissionCents(gross))).toBe(true);
    }
  });

  it("annule exactement un encaissement quand il est remboursé", () => {
    // La règle qui compte : un remboursement doit reprendre au centime ce que
    // l'encaissement avait donné. Un arrondi qui diverge laisserait des
    // centimes dus sur un client parti.
    for (const gross of [899, 1799, 5, 15, 1, 333, 12345]) {
      expect(commissionCents(gross) + commissionCents(-gross)).toBe(0);
    }
  });

  it("accepte un taux différent de celui en vigueur", () => {
    // Les lignes anciennes gardent leur taux : le calcul doit pouvoir le
    // rejouer sans dépendre de la constante du jour.
    expect(commissionCents(1000, 0.25)).toBe(250);
    expect(commissionCents(1000, 0)).toBe(0);
  });

  it("rend zéro plutôt que NaN sur une entrée absurde", () => {
    // Une facture Stripe mal lue ne doit pas écrire « NaN » dans une colonne
    // d'argent : mieux vaut zéro, visible et corrigeable.
    expect(commissionCents(Number.NaN)).toBe(0);
    expect(commissionCents(Number.POSITIVE_INFINITY)).toBe(0);
    expect(commissionCents(100, Number.NaN)).toBe(0);
  });

  it("garde le taux aligné sur le SQL", () => {
    expect(COMMISSION_RATE).toBe(0.3);
  });
});

describe("formatCents", () => {
  it("affiche des euros avec deux décimales", () => {
    // Espace insécable avant le symbole selon la convention française : on
    // compare sur les chiffres pour ne pas dépendre de son encodage.
    expect(formatCents(270)).toContain("2,70");
    expect(formatCents(0)).toContain("0,00");
    expect(formatCents(123456)).toContain("234,56");
  });

  it("affiche un remboursement en négatif", () => {
    expect(formatCents(-270)).toContain("-");
  });
});
