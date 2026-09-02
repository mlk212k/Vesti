import { describe, expect, it } from "vitest";
import { computeOverview, computeUsage } from "./admin-stats";

const NOW = new Date("2026-03-20T12:00:00Z");

function daysAgo(days: number): string {
  return new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000).toISOString();
}

describe("computeOverview", () => {
  it("compte les inscriptions par fenêtre de temps", () => {
    const overview = computeOverview(
      [
        { plan: "free", created_at: daysAgo(1), referral_code: null },
        { plan: "free", created_at: daysAgo(6), referral_code: null },
        { plan: "pro", created_at: daysAgo(20), referral_code: "LEA10" },
        { plan: "free", created_at: daysAgo(200), referral_code: null },
      ],
      NOW
    );

    expect(overview.signups).toBe(4);
    expect(overview.signups7d).toBe(2);
    expect(overview.signups30d).toBe(3);
  });

  it("calcule le MRR à partir des plans réels", () => {
    const overview = computeOverview(
      [
        { plan: "pro", created_at: daysAgo(1), referral_code: null },
        { plan: "pro", created_at: daysAgo(2), referral_code: null },
        { plan: "styliste", created_at: daysAgo(3), referral_code: null },
        { plan: "free", created_at: daysAgo(4), referral_code: null },
      ],
      NOW
    );

    // 2 × 8,99 + 1 × 17,99
    expect(overview.mrr).toBe(35.97);
    expect(overview.payingCustomers).toBe(3);
  });

  it("exprime la conversion en pourcentage à une décimale", () => {
    const overview = computeOverview(
      [
        { plan: "pro", created_at: daysAgo(1), referral_code: null },
        { plan: "free", created_at: daysAgo(1), referral_code: null },
        { plan: "free", created_at: daysAgo(1), referral_code: null },
      ],
      NOW
    );
    expect(overview.conversionRate).toBe(33.3);
  });

  it("ne divise pas par zéro sans utilisateur", () => {
    const overview = computeOverview([], NOW);
    expect(overview.conversionRate).toBe(0);
    expect(overview.mrr).toBe(0);
  });
});

describe("computeUsage", () => {
  it("estime le coût du modèle à partir des tokens", () => {
    // 1M de tokens d'entrée (5 $) + 200k de sortie (5 $) = 10 $
    const usage = computeUsage(
      [{ created_at: daysAgo(1), input_tokens: 1_000_000, output_tokens: 200_000 }],
      NOW
    );
    expect(usage.estimatedCost).toBe(10);
    expect(usage.costPerAnalysis).toBe(10);
  });

  it("tolère des analyses sans compteur de tokens", () => {
    const usage = computeUsage(
      [
        { created_at: daysAgo(1), input_tokens: null, output_tokens: null },
        { created_at: daysAgo(2), input_tokens: 100_000, output_tokens: 20_000 },
      ],
      NOW
    );
    expect(usage.analyses).toBe(2);
    expect(usage.inputTokens).toBe(100_000);
  });

  it("isole les analyses des 30 derniers jours", () => {
    const usage = computeUsage(
      [
        { created_at: daysAgo(3), input_tokens: 0, output_tokens: 0 },
        { created_at: daysAgo(45), input_tokens: 0, output_tokens: 0 },
      ],
      NOW
    );
    expect(usage.analyses).toBe(2);
    expect(usage.analyses30d).toBe(1);
  });

  it("ne divise pas par zéro sans analyse", () => {
    expect(computeUsage([], NOW).costPerAnalysis).toBe(0);
  });
});
