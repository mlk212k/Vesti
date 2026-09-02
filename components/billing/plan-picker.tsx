"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PLANS, PLAN_ORDER, formatPrice, type Plan } from "@/lib/plans";

const FEATURE_LABELS: { key: keyof (typeof PLANS)["free"]["features"]; label: string }[] = [
  { key: "dressing", label: "Garde-robe complète et suggestions de tenues" },
  { key: "history", label: "Historique et suivi de progression" },
  { key: "shopping", label: "Pièces similaires et conseils d'achat" },
];

export function PlanPicker({ currentPlan }: { currentPlan: Plan }) {
  const [pending, setPending] = useState<Plan | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function subscribe(plan: Exclude<Plan, "free">) {
    setPending(plan);
    setError(null);
    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.url) {
        throw new Error("checkout");
      }
      // Redirection pleine page : le Checkout hébergé de Stripe supporte mal
      // l'iframe et l'app est majoritairement consultée dans le navigateur
      // in-app de TikTok.
      window.location.assign(payload.url);
    } catch {
      setError("Impossible d'ouvrir le paiement. Réessaie dans un instant.");
      setPending(null);
    }
  }

  async function openPortal() {
    setPending(currentPlan);
    setError(null);
    try {
      const response = await fetch("/api/stripe/portal", { method: "POST" });
      const payload = await response.json();
      if (!response.ok || !payload.url) throw new Error("portal");
      window.location.assign(payload.url);
    } catch {
      setError("Impossible d'ouvrir la gestion de l'abonnement.");
      setPending(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {PLAN_ORDER.map((plan) => {
        const definition = PLANS[plan];
        const isCurrent = plan === currentPlan;

        return (
          <div
            key={plan}
            className={`flex flex-col gap-3 rounded-3xl border p-5 ${
              isCurrent ? "border-accent bg-surface" : "border-border-soft bg-surface"
            }`}
          >
            <div className="flex items-baseline justify-between gap-2">
              <div className="flex flex-col">
                <span className="text-base font-semibold">{definition.name}</span>
                <span className="text-xs text-muted">{definition.tagline}</span>
              </div>
              <span className="text-sm font-semibold">{formatPrice(plan)}</span>
            </div>

            <ul className="flex flex-col gap-1.5">
              <li className="text-sm text-muted">
                {definition.unlimitedMessaging
                  ? "Analyses illimitées"
                  : `${definition.analysesPerMonth} analyses par mois`}
              </li>
              {FEATURE_LABELS.map(({ key, label }) => (
                <li
                  key={key}
                  className={`text-sm ${
                    definition.features[key] ? "text-foreground" : "text-muted/50 line-through"
                  }`}
                >
                  {label}
                </li>
              ))}
            </ul>

            {isCurrent ? (
              <span className="text-center text-sm font-medium text-success">
                Ton plan actuel
              </span>
            ) : plan === "free" ? null : (
              <Button
                onClick={() => subscribe(plan)}
                disabled={pending !== null}
              >
                {pending === plan ? "Ouverture…" : `Passer en ${definition.name}`}
              </Button>
            )}
          </div>
        );
      })}

      {currentPlan !== "free" && (
        <Button variant="secondary" onClick={openPortal} disabled={pending !== null}>
          Gérer mon abonnement
        </Button>
      )}

      {error && <p className="text-center text-sm text-danger">{error}</p>}
    </div>
  );
}
