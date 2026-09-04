"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { updateLocation } from "@/lib/location-actions";
import { coarseLocation } from "@/lib/geo";

const OCCASIONS = ["travail", "rendez-vous", "soirée", "week-end", "sport"] as const;
type Occasion = (typeof OCCASIONS)[number];

interface Piece {
  id: string;
  category: string;
  label: string;
  color: string | null;
}

interface Suggestion {
  weather: { summary: string };
  outfit: { pieces: Piece[]; advice: string; missing: string | null };
}

type State =
  | { step: "idle" }
  | { step: "locating" }
  | { step: "loading" }
  | { step: "done"; suggestion: Suggestion }
  | { step: "error"; title: string; body: string; action: "upgrade" | "wardrobe" | null };

export function TodayCard({ hasLocation }: { hasLocation: boolean }) {
  const [located, setLocated] = useState(hasLocation);
  const [occasion, setOccasion] = useState<Occasion>("travail");
  const [state, setState] = useState<State>({ step: "idle" });

  /**
   * La position est demandée au moment où elle sert, pas à l'inscription : une
   * permission réclamée sans raison visible est refusée par réflexe.
   */
  function requestLocation() {
    if (!navigator.geolocation) {
      setState({
        step: "error",
        title: "Localisation indisponible",
        body: "Ton navigateur ne permet pas de récupérer ta position.",
        action: null,
      });
      return;
    }

    setState({ step: "locating" });
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        // ⚠️ L'arrondi ne se fait plus ici. Ce composant écrivait lui-même en
        // base, en arrondissant au passage : la promesse « on ne garde pas ta
        // position exacte » ne tenait donc qu'à ce fichier, et un appel forgé
        // l'ignorait. C'est le serveur qui arrondit maintenant, une fois pour
        // les deux écrans qui demandent la position. Voir `lib/geo.ts`.
        const coarse = coarseLocation(
          position.coords.latitude,
          position.coords.longitude
        );
        const result = coarse
          ? await updateLocation(coarse.latitude, coarse.longitude)
          : { ok: false };

        if (!result.ok) {
          setState({
            step: "error",
            title: "Position non enregistrée",
            body: "Réessaie dans un instant.",
            action: null,
          });
          return;
        }

        setLocated(true);
        setState({ step: "idle" });
      },
      () => {
        setState({
          step: "error",
          title: "Position refusée",
          body: "Autorise la localisation pour recevoir une tenue adaptée au temps qu'il fait.",
          action: null,
        });
      },
      { maximumAge: 600_000, timeout: 10_000 }
    );
  }

  async function suggest() {
    setState({ step: "loading" });
    try {
      const response = await fetch("/api/today", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ occasion }),
      });
      const payload = await response.json();

      if (!response.ok) {
        setState({
          step: "error",
          title: payload.message?.title ?? "Suggestion indisponible",
          body: payload.message?.body ?? "Réessaie dans un instant.",
          action:
            payload.error === "plan_required"
              ? "upgrade"
              : payload.error === "empty_wardrobe"
                ? "wardrobe"
                : null,
        });
        return;
      }

      setState({ step: "done", suggestion: payload });
    } catch {
      setState({
        step: "error",
        title: "Suggestion indisponible",
        body: "Réessaie dans un instant.",
        action: null,
      });
    }
  }

  return (
    <section className="flex flex-col gap-4 rounded-[var(--radius-card)] border border-border-soft bg-surface p-5">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold">Aujourd&apos;hui</h2>
        {state.step === "done" && (
          <span className="text-xs text-muted">{state.suggestion.weather.summary}</span>
        )}
      </div>

      {!located ? (
        <>
          <p className="text-sm leading-relaxed text-muted">
            Active ta position et Vesti te dit quoi mettre selon le temps qu&apos;il
            fait, avec ce que tu as déjà.
          </p>
          <Button
            variant="secondary"
            onClick={requestLocation}
            disabled={state.step === "locating"}
          >
            {state.step === "locating" ? "Localisation…" : "Activer ma position"}
          </Button>
        </>
      ) : (
        <>
          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
            {OCCASIONS.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setOccasion(value);
                  setState({ step: "idle" });
                }}
                className={`min-h-[38px] flex-none rounded-full border px-3.5 text-sm transition ${
                  occasion === value
                    ? "border-accent bg-accent text-accent-foreground"
                    : "border-border bg-background text-foreground"
                }`}
              >
                {value}
              </button>
            ))}
          </div>

          {state.step === "done" ? (
            <div className="flex flex-col gap-3">
              <ul className="flex flex-wrap gap-1.5">
                {state.suggestion.outfit.pieces.map((piece) => (
                  <li
                    key={piece.id}
                    className="rounded-full bg-accent-soft px-3 py-1 text-xs font-semibold text-accent-strong"
                  >
                    {piece.label}
                  </li>
                ))}
              </ul>
              <p className="text-sm leading-relaxed">{state.suggestion.outfit.advice}</p>
              {state.suggestion.outfit.missing && (
                <p className="rounded-[var(--radius-control)] border border-border bg-background p-3 text-xs leading-relaxed text-muted">
                  {state.suggestion.outfit.missing}
                </p>
              )}
              <Button variant="ghost" onClick={() => setState({ step: "idle" })}>
                Changer d&apos;occasion
              </Button>
            </div>
          ) : state.step === "error" ? (
            <div className="flex flex-col gap-3">
              <p className="text-sm font-medium">{state.title}</p>
              <p className="text-sm leading-relaxed text-muted">{state.body}</p>
              {state.action === "upgrade" && (
                <Link href="/billing">
                  <Button variant="secondary">Voir les plans</Button>
                </Link>
              )}
              {state.action === "wardrobe" && (
                <Link href="/dressing/scan">
                  <Button variant="secondary">Scanner mon dressing</Button>
                </Link>
              )}
            </div>
          ) : (
            // `secondary` et non `primary` : sur l'accueil, cette carte est
            // posée juste sous « Analyser une tenue ». Deux aplats violets
            // pleine largeur l'un au-dessus de l'autre, et plus aucun des deux
            // n'est l'action principale — c'est la règle que se donne
            // `components/ui/button.tsx` : un seul aplat saturé par écran.
            <Button
              variant="secondary"
              onClick={suggest}
              disabled={state.step === "loading"}
            >
              {state.step === "loading" ? "Composition…" : "Que mettre aujourd'hui ?"}
            </Button>
          )}
        </>
      )}
    </section>
  );
}
