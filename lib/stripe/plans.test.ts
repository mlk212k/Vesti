import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

/**
 * Catalogue Stripe simulé : deux prix portant les `lookup_key` que le code
 * cherche. C'est la seule source du mapping — plus aucune variable
 * d'environnement n'y participe.
 */
const list = vi.fn(async () => ({
  data: [
    { id: "price_pro_123", lookup_key: "vesti_pro_monthly" },
    { id: "price_styliste_456", lookup_key: "vesti_styliste_monthly" },
  ],
}));

vi.mock("@/lib/stripe/client", () => ({
  getStripe: () => ({ prices: { list } }),
}));

const { planFromPriceId, priceIdForPlan, statusGrantsAccess } = await import("./plans");

describe("planFromPriceId", () => {
  it("traduit les prix connus", async () => {
    expect(await planFromPriceId("price_pro_123")).toBe("pro");
    expect(await planFromPriceId("price_styliste_456")).toBe("styliste");
  });

  it("retombe sur free plutôt que d'accorder un plan au hasard", async () => {
    // Un price inconnu (ancien tarif, erreur de config) ne doit jamais ouvrir
    // par défaut un accès payant.
    expect(await planFromPriceId("price_inconnu")).toBe("free");
    expect(await planFromPriceId(null)).toBe("free");
    expect(await planFromPriceId(undefined)).toBe("free");
  });

  it("fait l'aller-retour plan → price → plan", async () => {
    expect(await planFromPriceId(await priceIdForPlan("pro"))).toBe("pro");
    expect(await planFromPriceId(await priceIdForPlan("styliste"))).toBe("styliste");
  });

  it("résout chaque plan sur SON prix, jamais sur celui de l'autre", async () => {
    // Le test qui aurait attrapé l'inversion : les deux identifiants réels ne
    // diffèrent que d'un caractère, et une correspondance croisée passait
    // inaperçue tant que personne ne comparait les deux plans entre eux.
    expect(await priceIdForPlan("pro")).toBe("price_pro_123");
    expect(await priceIdForPlan("styliste")).toBe("price_styliste_456");
    expect(await priceIdForPlan("pro")).not.toBe(await priceIdForPlan("styliste"));
  });

  it("ne relit le catalogue qu'une fois", async () => {
    // Un aller-retour réseau par passage en caisse et par webhook serait payé
    // pour un catalogue qui ne change jamais en cours de vie d'une instance.
    const before = list.mock.calls.length;
    await priceIdForPlan("pro");
    await planFromPriceId("price_pro_123");
    expect(list.mock.calls.length).toBe(before);
  });
});

describe("statusGrantsAccess", () => {
  it("ouvre l'accès sur les statuts actifs", () => {
    expect(statusGrantsAccess("active")).toBe(true);
    expect(statusGrantsAccess("trialing")).toBe(true);
  });

  it("laisse l'accès pendant les relances de paiement", () => {
    // Stripe relance encore : couper tout de suite ferait fuir un client qui
    // va régulariser.
    expect(statusGrantsAccess("past_due")).toBe(true);
  });

  it("coupe l'accès sur les statuts terminaux", () => {
    expect(statusGrantsAccess("canceled")).toBe(false);
    expect(statusGrantsAccess("unpaid")).toBe(false);
    expect(statusGrantsAccess("incomplete_expired")).toBe(false);
  });
});
