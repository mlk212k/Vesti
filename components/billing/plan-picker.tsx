"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PLANS, PLAN_ORDER, formatPrice, type Plan } from "@/lib/plans";

const FEATURE_LABELS: { key: keyof (typeof PLANS)["free"]["features"]; label: string }[] = [
  { key: "dressing", label: "Garde-robe complète et suggestions de tenues" },
  { key: "history", label: "Historique et suivi de progression" },
  { key: "shopping", label: "Recherche d'achat et pièces similaires" },
];

export function PlanPicker({ currentPlan }: { currentPlan: Plan }) {
  const [pending, setPending] = useState<Plan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const subscribed = currentPlan !== "free";

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
            className={`flex flex-col gap-3 rounded-[var(--radius-card)] border p-5 ${
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

            <ul className="flex flex-col gap-2 border-t border-border-soft pt-3">
              <li className="flex items-start gap-2 text-sm">
                <Check on />
                <span>
                  {definition.unlimitedMessaging ? (
                    <>
                      Analyses illimitées
                      {/* Le plafond fair-use est écrit noir sur blanc : vendre
                          « illimité » et bloquer à 50 sans l'avoir dit est ce
                          qui produit un litige, pas une limite raisonnable. */}
                      <span className="text-muted">
                        {" "}
                        — plafond anti-abus à {definition.analysesPerMonth}/mois
                      </span>
                    </>
                  ) : (
                    `${definition.analysesPerMonth} analyses par mois`
                  )}
                </span>
              </li>

              {FEATURE_LABELS.map(({ key, label }) => {
                const on = definition.features[key];
                return (
                  <li
                    key={key}
                    className={`flex items-start gap-2 text-sm ${on ? "" : "text-muted"}`}
                  >
                    <Check on={on} />
                    <span>{label}</span>
                  </li>
                );
              })}
            </ul>

            {isCurrent ? (
              <span className="text-center text-sm font-medium text-success">
                Ton plan actuel
              </span>
            ) : plan === "free" ? null : (
              <Button
                // Déjà abonné : un changement de formule passe par le portail,
                // pas par un nouvel achat — sinon deux abonnements tournent en
                // parallèle et le client est facturé deux fois. Le serveur
                // refuse de toute façon (voir app/api/stripe/checkout), mais
                // autant ne pas promener l'utilisateur pour rien.
                onClick={() => (subscribed ? openPortal() : subscribe(plan))}
                disabled={pending !== null}
              >
                {pending === plan
                  ? "Ouverture…"
                  : subscribed
                    ? `Passer en ${definition.name}`
                    : `Choisir ${definition.name}`}
              </Button>
            )}
          </div>
        );
      })}

      {subscribed && (
        <Button variant="secondary" onClick={openPortal} disabled={pending !== null}>
          Gérer mon abonnement
        </Button>
      )}

      {error && <p className="text-center text-sm text-danger">{error}</p>}
    </div>
  );
}

/**
 * Coche ou croix, jamais un texte barré.
 *
 * Le barré disait « ce n'était plus disponible » là où il fallait lire « ce
 * n'est pas inclus dans cette offre ». Une croix est explicite, et surtout elle
 * reste lisible : le texte barré grisé passait sous le seuil de contraste.
 */
function Check({ on }: { on?: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`mt-0.5 flex-none ${on ? "text-success" : "text-muted"}`}
      aria-label={on ? "Inclus" : "Non inclus"}
      role="img"
    >
      {on ? <path d="M4.5 12.5 9.5 17.5 19.5 6.5" /> : <path d="M6.5 6.5 17.5 17.5M17.5 6.5 6.5 17.5" />}
    </svg>
  );
}
