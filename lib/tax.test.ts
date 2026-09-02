import { describe, expect, it } from "vitest";
import { VAT_ENABLED, VAT_RATE, activeVatRate, netCents, vatCents, vatMention } from "./tax";

const TVA = 0.2;

describe("aujourd'hui : franchise en base", () => {
  it("ne retire rien tant que la TVA n'est pas activée", () => {
    // Le comportement actuel doit être STRICTEMENT inchangé : préparer la TVA
    // ne doit pas modifier d'un centime ce qui est calculé aujourd'hui.
    expect(activeVatRate()).toBe(0);
    expect(netCents(899)).toBe(899);
    expect(netCents(1799)).toBe(1799);
    expect(vatCents(899)).toBe(0);
  });

  it("affiche la mention de la franchise", () => {
    expect(vatMention()).toBe("TVA non applicable, art. 293 B du CGI");
  });

  it("reste désactivée tant que personne ne l'a décidé", () => {
    // Sentinelle : si ce test rougit, c'est que quelqu'un a basculé la TVA.
    // C'est peut-être voulu — mais ça ne doit jamais passer inaperçu.
    expect(VAT_ENABLED).toBe(false);
    expect(VAT_RATE).toBe(0.2);
  });
});

describe("après le seuil : TVA à 20 %", () => {
  it("sort le HT d'un prix affiché TTC", () => {
    // 8,99 € TTC → 7,49 € HT et 1,50 € de TVA. C'est le chiffre qui change tout
    // le tableau de marge le jour de la bascule.
    expect(netCents(899, TVA)).toBe(749);
    expect(vatCents(899, TVA)).toBe(150);

    // 17,99 € TTC → 14,99 € HT, 3,00 € de TVA.
    expect(netCents(1799, TVA)).toBe(1499);
    expect(vatCents(1799, TVA)).toBe(300);
  });

  it("ne perd ni n'invente jamais un centime", () => {
    // L'invariant qui compte : la TVA est calculée par différence, donc les
    // deux parts se recomposent exactement. Deux multiplications indépendantes
    // dériveraient d'un centime sur certains montants — sur des milliers de
    // factures, cet écart devient un écart de déclaration.
    for (let gross = 0; gross <= 5000; gross++) {
      expect(netCents(gross, TVA) + vatCents(gross, TVA)).toBe(gross);
    }
  });

  it("annule exactement un remboursement", () => {
    // Un remboursement doit défaire l'encaissement au centime près, sinon le
    // registre garde un résidu que personne ne sait expliquer.
    for (const gross of [899, 1799, 1, 7, 12345]) {
      expect(netCents(gross, TVA) + netCents(-gross, TVA)).toBe(0);
      expect(vatCents(gross, TVA) + vatCents(-gross, TVA)).toBe(0);
    }
  });

  it("rend toujours des entiers", () => {
    for (const gross of [899, 1799, 1, 3, 7, 999]) {
      expect(Number.isInteger(netCents(gross, TVA))).toBe(true);
      expect(Number.isInteger(vatCents(gross, TVA))).toBe(true);
    }
  });

  it("retire toujours quelque chose sur un montant non nul", () => {
    // Garde-fou contre une bascule qui ne ferait rien : si la TVA est active,
    // le net doit être strictement inférieur au brut.
    expect(netCents(899, TVA)).toBeLessThan(899);
    expect(netCents(100, TVA)).toBeLessThan(100);
  });

  it("ne fabrique pas de nombre absurde sur une entrée cassée", () => {
    expect(netCents(Number.NaN, TVA)).toBe(0);
    expect(vatCents(Number.NaN, TVA)).toBe(0);
    expect(netCents(899, Number.NaN)).toBe(0);
  });
});
