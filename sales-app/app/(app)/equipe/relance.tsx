"use client";

import { useActionState, useState } from "react";
import { Alerte } from "@/components/alerte";
import { Submit } from "@/components/submit";
import type { ActionResult } from "@/lib/errors";
import { jouer } from "@/lib/sfx";
import { relancerAction } from "./relance-actions";

// Bouton de relance. Deux temps : on ouvre, on écrit un mot si on veut, on
// envoie. Un bouton qui enverrait une notification au premier clic finirait
// par partir tout seul depuis une poche.
export function Relance({
  memberId,
  nom,
}: {
  memberId: string;
  nom: string;
}) {
  const [ouvert, setOuvert] = useState(false);
  const [state, action] = useActionState<ActionResult | undefined, FormData>(
    async (precedent: ActionResult | undefined, donnees: FormData) => {
      const resultat = await relancerAction(precedent, donnees);
      jouer(resultat.ok ? "blip" : "erreur");
      return resultat;
    },
    undefined,
  );

  if (state?.ok) {
    return (
      <p className="text-sm text-peche">
        Relance envoyée à {nom.split(" ")[0]}
      </p>
    );
  }

  if (!ouvert) {
    return (
      <button
        type="button"
        onClick={() => setOuvert(true)}
        className="btn btn-fantome w-full py-2 text-sm"
      >
        Relancer {nom.split(" ")[0]}
      </button>
    );
  }

  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="member_id" value={memberId} />
      <input
        name="message"
        maxLength={500}
        className="champ text-sm"
        placeholder="Un mot ? (facultatif)"
        aria-label="Message de relance"
      />
      {state && !state.ok ? <Alerte>{state.error}</Alerte> : null}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setOuvert(false)}
          className="btn btn-fantome flex-1 py-2 text-sm"
        >
          Annuler
        </button>
        <Submit className="btn btn-primaire flex-1 py-2 text-sm" pendingLabel="…">
          Envoyer
        </Submit>
      </div>
    </form>
  );
}
