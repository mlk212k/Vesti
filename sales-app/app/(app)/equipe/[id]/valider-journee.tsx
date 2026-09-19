"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";
import { Alerte } from "@/components/alerte";
import { Submit } from "@/components/submit";
import type { ActionResult } from "@/lib/errors";
import { formatCents } from "@/lib/money";
import { usePanneau } from "@/lib/use-panneau";
import { validateDayAction } from "../actions";

// Validation d'une journée, avec retenue éventuelle.
//
// Le montant par défaut vient des paramètres, mais il est pré-rempli à VIDE
// et non au montant de la pénalité : valider une journée ne doit pas coûter
// de l'argent à quelqu'un par simple inattention du manager. Il faut le
// saisir sciemment.
export function ValiderJournee({
  dayId,
  objectifAtteint,
  penaliteSuggereeCents,
}: {
  dayId: string;
  objectifAtteint: boolean;
  penaliteSuggereeCents: number;
}) {
  const router = useRouter();
  const [state, action] = useActionState<ActionResult | undefined, FormData>(
    validateDayAction,
    undefined,
  );
  const [ouvert, setOuvert] = usePanneau(state);

  useEffect(() => {
    if (state?.ok) router.refresh();
  }, [state, router]);

  if (!ouvert) {
    return (
      <button
        type="button"
        onClick={() => setOuvert(true)}
        className="btn w-full py-2.5 text-sm"
      >
        Valider cette journée
      </button>
    );
  }

  return (
    <form action={action} className="panneau-creux space-y-3 p-4">
      <input type="hidden" name="day_id" value={dayId} />

      {!objectifAtteint && penaliteSuggereeCents > 0 ? (
        <p className="text-xs text-[#ffcf8a]">
          Objectif non atteint. La règle configurée prévoit une retenue de{" "}
          {formatCents(penaliteSuggereeCents)} — à appliquer, ajuster, ou
          laisser à zéro.
        </p>
      ) : (
        <p className="text-xs text-faint">
          Valider fige la journée : elle ne pourra plus être rouverte.
        </p>
      )}

      <div>
        <label className="libelle" htmlFor={`penalty-${dayId}`}>
          Retenue (€)
        </label>
        <input
          id={`penalty-${dayId}`}
          name="penalty"
          inputMode="decimal"
          className="champ"
          placeholder="0"
        />
      </div>

      {state && !state.ok ? <Alerte>{state.error}</Alerte> : null}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setOuvert(false)}
          className="btn btn-fantome flex-1 py-2.5 text-sm"
        >
          Annuler
        </button>
        <Submit className="btn btn-primaire flex-1 py-2.5 text-sm" pendingLabel="…">
          Valider
        </Submit>
      </div>
    </form>
  );
}
