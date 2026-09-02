import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/env.server", () => ({
  serverEnv: {
    stripePricePro: "price_pro_123",
    stripePriceStyliste: "price_styliste_456",
  },
}));

const { planFromPriceId, priceIdForPlan, statusGrantsAccess } = await import("./plans");

describe("planFromPriceId", () => {
  it("traduit les prix connus", () => {
    expect(planFromPriceId("price_pro_123")).toBe("pro");
    expect(planFromPriceId("price_styliste_456")).toBe("styliste");
  });

  it("retombe sur free plutôt que d'accorder un plan au hasard", () => {
    // Un price inconnu (ancien tarif, erreur de config) ne doit jamais ouvrir
    // par défaut un accès payant.
    expect(planFromPriceId("price_inconnu")).toBe("free");
    expect(planFromPriceId(null)).toBe("free");
    expect(planFromPriceId(undefined)).toBe("free");
  });

  it("fait l'aller-retour plan → price → plan", () => {
    expect(planFromPriceId(priceIdForPlan("pro"))).toBe("pro");
    expect(planFromPriceId(priceIdForPlan("styliste"))).toBe("styliste");
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
