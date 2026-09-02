import { describe, expect, it, vi, beforeEach } from "vitest";

const insertResult = { data: null as unknown, error: null as unknown };

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: () => ({
      insert: () => ({
        select: async () => insertResult,
      }),
    }),
  }),
}));

const { claimEvent } = await import("./sync");

beforeEach(() => {
  insertResult.data = null;
  insertResult.error = null;
});

describe("claimEvent", () => {
  it("réserve un event jamais vu", async () => {
    insertResult.data = [{ id: "evt_1" }];
    expect(await claimEvent("evt_1", "checkout.session.completed")).toBe("claimed");
  });

  it("détecte un rejeu Stripe via la violation d'unicité", async () => {
    insertResult.error = { code: "23505", message: "duplicate key" };
    expect(await claimEvent("evt_1", "checkout.session.completed")).toBe("duplicate");
  });

  it("signale une panne au lieu de la confondre avec un doublon", async () => {
    // Le cas qui coûte cher : si on renvoyait "duplicate" ici, le webhook
    // répondrait 200, Stripe ne rejouerait jamais, et un client ayant payé
    // resterait sur le plan gratuit.
    insertResult.error = { code: "08006", message: "connection failure" };
    expect(await claimEvent("evt_1", "checkout.session.completed")).toBe("error");
  });
});
