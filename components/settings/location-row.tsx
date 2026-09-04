"use client";

import { useState, useTransition } from "react";
import { updateLocation } from "@/lib/location-actions";
import { coarseLocation } from "@/lib/geo";

type State =
  | { step: "idle" }
  | { step: "locating" }
  | { step: "saved" }
  | { step: "denied" }
  | { step: "unsupported" }
  | { step: "failed" };

/**
 * La ligne « Localisation » des paramètres : on appuie, le téléphone demande.
 *
 * ── Ce qu'il faut savoir avant de toucher à ce fichier ──────────────────────
 *
 * 1. La demande d'autorisation DOIT partir d'un geste. Les navigateurs
 *    n'affichent la fenêtre système que si `getCurrentPosition` est appelé
 *    pendant le traitement d'un vrai tap. Appelé au chargement de la page, il
 *    est ignoré en silence — pas d'erreur, pas de fenêtre, rien.
 *
 * 2. ⚠️ Un refus est DÉFINITIF jusqu'à intervention dans les réglages du
 *    téléphone. Une fois « Refuser » touché, les appels suivants échouent
 *    instantanément, sans jamais réafficher la fenêtre. Sans le message prévu
 *    pour ce cas, l'utilisateur appuierait en boucle sur une ligne qui ne fait
 *    visiblement rien — c'est le pire état possible pour un réglage.
 *
 * 3. La position n'est demandée qu'ici et sur l'accueil, au moment où elle
 *    sert. Une permission réclamée sans raison visible est refusée par réflexe,
 *    et le point 2 rend ce réflexe irréversible.
 */
export function LocationRow({ hasLocation }: { hasLocation: boolean }) {
  const [state, setState] = useState<State>({ step: "idle" });
  const [pending, startTransition] = useTransition();

  const busy = state.step === "locating" || pending;
  const active = hasLocation || state.step === "saved";

  function request() {
    if (busy) return;

    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setState({ step: "unsupported" });
      return;
    }

    setState({ step: "locating" });
    navigator.geolocation.getCurrentPosition(
      (position) => {
        // Arrondi AUSSI ici, avant l'envoi. Le serveur arrondit de toute
        // façon — c'est lui qui fait foi, un client modifié ne peut pas s'en
        // affranchir — mais tant qu'à faire, la position exacte ne quitte pas
        // le téléphone. Deux gardes au lieu d'une : celle-ci évite d'envoyer ce
        // qu'on n'a pas le droit de garder, celle du serveur évite de le
        // stocker. Même fonction pour les deux, donc pas de dérive possible.
        const coarse = coarseLocation(
          position.coords.latitude,
          position.coords.longitude
        );

        if (!coarse) {
          setState({ step: "failed" });
          return;
        }

        startTransition(async () => {
          const result = await updateLocation(coarse.latitude, coarse.longitude);
          setState(result.ok ? { step: "saved" } : { step: "failed" });
        });
      },
      (error) => {
        // Code 1 = PERMISSION_DENIED. Les autres (position indisponible,
        // délai dépassé) se réessaient ; celui-là, non.
        setState(
          error.code === error.PERMISSION_DENIED
            ? { step: "denied" }
            : { step: "failed" }
        );
      },
      // `maximumAge` : une position vieille de dix minutes convient largement
      // pour savoir s'il pleut, et évite de rallumer le GPS.
      { maximumAge: 600_000, timeout: 10_000 }
    );
  }

  return (
    <div className="flex flex-col">
      <button
        type="button"
        onClick={request}
        disabled={busy}
        style={{ touchAction: "manipulation" }}
        className="flex min-h-[52px] items-center justify-between gap-3 px-4 py-3 text-left transition-colors active:bg-surface-sunken disabled:opacity-60"
      >
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="text-[15px] font-medium">Ma position</span>
          <span className="text-xs leading-relaxed text-muted">
            {active
              ? "Appuie pour la mettre à jour si tu as changé de ville."
              : "Appuie pour autoriser : ton téléphone te demandera la permission."}
          </span>
        </span>
        <span className="flex flex-none items-center gap-2">
          <span className="text-sm text-muted">
            {busy ? "…" : active ? "Activée" : "Désactivée"}
          </span>
          {!busy && <Target active={active} />}
        </span>
      </button>

      {state.step !== "idle" && state.step !== "locating" && (
        <p
          role="status"
          className={`px-4 pb-3 text-xs leading-relaxed ${
            state.step === "saved" ? "text-success" : "text-danger"
          }`}
        >
          {MESSAGES[state.step]}
        </p>
      )}
    </div>
  );
}

const MESSAGES: Record<Exclude<State["step"], "idle" | "locating">, string> = {
  saved:
    "Position enregistrée, arrondie au kilomètre. « Que mettre aujourd'hui ? » tient maintenant compte du temps qu'il fait.",
  // Le seul message qui doit expliquer une manipulation : la fenêtre ne
  // reviendra pas d'elle-même, et rien dans l'app ne peut la faire revenir.
  denied:
    "Ton téléphone a retenu ce refus et ne redemandera plus. Pour l'autoriser, il faut réactiver la localisation pour Vesti dans les réglages de ton téléphone.",
  unsupported: "Ce navigateur ne sait pas donner de position.",
  failed:
    "Position introuvable pour le moment. Réessaie dehors ou dans un instant.",
};

/** Un viseur : le symbole universel de « me localiser ». */
function Target({ active }: { active: boolean }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      className={`flex-none ${active ? "text-accent-strong" : "text-muted"}`}
      aria-hidden
    >
      <circle cx="12" cy="12" r="7" />
      <circle cx="12" cy="12" r="2.2" fill="currentColor" stroke="none" />
      <path d="M12 2.6v2.2M12 19.2v2.2M21.4 12h-2.2M4.8 12H2.6" />
    </svg>
  );
}
