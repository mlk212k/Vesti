"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

interface Weather {
  temperature: number;
  minTemperature: number;
  maxTemperature: number;
  precipitationProbability: number;
  city: string | null;
  label: string;
  summary: string;
}

interface Piece {
  id: string;
  category: string;
  label: string;
  color: string | null;
}

type Outfit = { pieces: Piece[]; advice: string; missing: string | null };

type WeatherState =
  | { step: "loading" }
  | { step: "no-location" }
  | { step: "unavailable" }
  | { step: "ready"; weather: Weather };

/**
 * La météo du jour, dans la garde-robe.
 *
 * Elle est ici et pas seulement sur l'accueil parce que c'est ici qu'elle sert :
 * la question « qu'est-ce que je mets » se pose devant sa penderie, et la
 * réponse se compose avec les pièces de cette page.
 *
 * Deux temps, pour deux prix. La température s'affiche seule dès l'ouverture —
 * elle ne coûte rien. La tenue demande un appel au modèle et attend donc un
 * geste : proposer une tenue que personne n'a demandée, à chaque passage sur
 * l'onglet, serait payé plusieurs fois par jour pour rien.
 */
export function WeatherPill({ hasWardrobe }: { hasWardrobe: boolean }) {
  const [state, setState] = useState<WeatherState>({ step: "loading" });
  const [outfit, setOutfit] = useState<Outfit | null>(null);
  const [asking, setAsking] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/weather")
      .then(async (response) => {
        const payload = await response.json();
        if (cancelled) return;

        if (response.ok) setState({ step: "ready", weather: payload });
        else if (payload.error === "no_location") setState({ step: "no-location" });
        else setState({ step: "unavailable" });
      })
      .catch(() => {
        if (!cancelled) setState({ step: "unavailable" });
      });

    return () => {
      cancelled = true;
    };
  }, []);

  /**
   * La position est demandée au moment où elle sert, pas à l'inscription : une
   * permission réclamée sans raison visible est refusée par réflexe.
   */
  function locate() {
    if (!navigator.geolocation) {
      setState({ step: "unavailable" });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const supabase = createClient();
        const { data } = await supabase.auth.getUser();
        // Arrondi au centième de degré (~1 km) : assez pour la météo, et on
        // n'enregistre pas la position précise de quelqu'un.
        await supabase
          .from("profiles")
          .update({
            latitude: Number(position.coords.latitude.toFixed(2)),
            longitude: Number(position.coords.longitude.toFixed(2)),
          })
          .eq("id", data.user?.id ?? "");

        setState({ step: "loading" });
        const response = await fetch("/api/weather");
        const payload = await response.json();
        setState(
          response.ok ? { step: "ready", weather: payload } : { step: "unavailable" }
        );
      },
      () => setState({ step: "no-location" }),
      { maximumAge: 600_000, timeout: 10_000 }
    );
  }

  async function askOutfit() {
    setAsking(true);
    setProblem(null);
    try {
      const response = await fetch("/api/today", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ occasion: "travail" }),
      });
      const payload = await response.json();

      if (!response.ok) {
        setProblem(payload?.message?.body ?? "Pas de tenue proposée pour le moment.");
        return;
      }
      setOutfit(payload.outfit);
    } catch {
      setProblem("Pas de tenue proposée pour le moment.");
    } finally {
      setAsking(false);
    }
  }

  if (state.step === "loading" || state.step === "unavailable") return null;

  if (state.step === "no-location") {
    return (
      <button
        type="button"
        onClick={locate}
        style={{ touchAction: "manipulation" }}
        className="flex items-center gap-2 self-start rounded-full border border-border-soft bg-surface px-4 py-2 text-xs font-semibold text-muted transition hover:border-accent hover:text-accent-strong"
      >
        <CloudIcon />
        Voir la météo chez toi
      </button>
    );
  }

  const { weather } = state;

  return (
    <section className="flex flex-col gap-3 rounded-[var(--radius-card)] border border-border-soft bg-surface p-4 shadow-[var(--shadow-card)]">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-accent-soft text-accent-strong">
          <CloudIcon />
        </span>
        <div className="flex min-w-0 flex-col">
          <span className="flex items-baseline gap-1.5">
            <span className="font-[family-name:var(--font-bricolage)] text-2xl font-extrabold leading-none tabular-nums">
              {Math.round(weather.temperature)}°
            </span>
            <span className="truncate text-xs text-muted">
              {weather.city ? `${weather.city} · ` : ""}
              {weather.label}
            </span>
          </span>
          <span className="text-xs text-muted tabular-nums">
            {Math.round(weather.minTemperature)}° / {Math.round(weather.maxTemperature)}°
            {weather.precipitationProbability > 20
              ? ` · ${weather.precipitationProbability}% de pluie`
              : ""}
          </span>
        </div>
      </div>

      {/* Sans garde-robe il n'y a rien à composer : on le dit, et on montre le
          chemin. Proposer un bouton qui échouerait serait pire que rien. */}
      {!hasWardrobe ? (
        <div className="flex flex-col gap-2 border-t border-border-soft pt-3">
          <p className="text-xs leading-relaxed text-muted">
            Remplis ta garde-robe et Vesti te dira quoi mettre par ce temps-là,
            avec tes propres vêtements.
          </p>
          <Link href="/dressing/scan">
            <Button variant="secondary">Scanner ma penderie</Button>
          </Link>
        </div>
      ) : outfit ? (
        <div className="flex flex-col gap-2 border-t border-border-soft pt-3">
          <ul className="flex flex-wrap gap-1.5">
            {outfit.pieces.map((piece) => (
              <li
                key={piece.id}
                className="rounded-full bg-surface-sunken px-3 py-1 text-xs font-medium"
              >
                {piece.label}
              </li>
            ))}
          </ul>
          <p className="text-xs leading-relaxed text-muted">{outfit.advice}</p>
          {outfit.missing && (
            <p className="text-xs leading-relaxed text-accent-strong">
              Il te manquerait : {outfit.missing}
            </p>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-2 border-t border-border-soft pt-3">
          <Button variant="secondary" onClick={askOutfit} disabled={asking}>
            {asking ? "Vesti compose…" : "Quoi mettre aujourd'hui ?"}
          </Button>
          {problem && <p className="text-xs text-danger">{problem}</p>}
        </div>
      )}
    </section>
  );
}

/** Nuage au trait, même grammaire que les icônes de la barre d'onglets. */
function CloudIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M7.2 18.5h9.4a4 4 0 0 0 .5-7.97 5.6 5.6 0 0 0-10.72-1.2A3.9 3.9 0 0 0 7.2 18.5Z" />
    </svg>
  );
}
