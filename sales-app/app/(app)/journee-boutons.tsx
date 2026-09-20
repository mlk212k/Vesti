"use client";

import { useActionState, useState } from "react";
import { jouer } from "@/lib/sfx";
import { Alerte } from "@/components/alerte";
import { IconPlay, IconStop } from "@/components/icons";
import { Submit } from "@/components/submit";
import type { ActionResult } from "@/lib/errors";
import { endDayAction, startDayAction } from "./actions";

export function BoutonCommencer() {
  const [state, action] = useActionState<ActionResult | undefined, FormData>(
    async () => {
      const resultat = await startDayAction();
      // Le son part sur le RÉSULTAT, pas sur le clic : entendre le tampon
      // alors que l'ouverture a échoué serait un mensonge sonore.
      jouer(resultat.ok ? "tampon" : "erreur");
      return resultat;
    },
    undefined,
  );

  return (
    <form action={action} className="space-y-3">
      <Submit className="btn btn-primaire w-full py-4 text-base" pendingLabel="Ouverture…">
        <IconPlay className="h-5 w-5" />
        Commencer ma journée
      </Submit>
      {state && !state.ok ? <Alerte>{state.error}</Alerte> : null}
    </form>
  );
}

// Terminer sa journée est irréversible dans l'esprit du commercial : on
// demande donc une confirmation, et on en profite pour proposer une note
// (« 3 commerces fermés », « pluie toute l'aprèm »). Un simple dépliement,
// pas une fenêtre modale : moins de code, et ça marche sans JavaScript chargé.
export function BoutonTerminer() {
  const [ouvert, setOuvert] = useState(false);
  const [state, action] = useActionState<ActionResult | undefined, FormData>(
    async (precedent: ActionResult | undefined, donnees: FormData) => {
      const resultat = await endDayAction(precedent, donnees);
      jouer(resultat.ok ? "tampon" : "erreur");
      return resultat;
    },
    undefined,
  );

  if (!ouvert) {
    return (
      <div className="space-y-3">
        <button
          type="button"
          onClick={() => setOuvert(true)}
          className="btn btn-primaire w-full py-4 text-base"
        >
          <IconStop className="h-5 w-5" />
          Terminer ma journée
        </button>
        {state && !state.ok ? <Alerte>{state.error}</Alerte> : null}
      </div>
    );
  }

  return (
    <form action={action} className="space-y-3">
      <div>
        <label className="libelle" htmlFor="notes">
          Une note sur la journée ? (facultatif)
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          maxLength={2000}
          className="champ resize-none"
          placeholder="Secteur difficile, beaucoup de fermés…"
        />
      </div>

      {state && !state.ok ? <Alerte>{state.error}</Alerte> : null}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setOuvert(false)}
          className="btn btn-fantome flex-1"
        >
          Annuler
        </button>
        <Submit className="btn btn-primaire flex-[2] py-3" pendingLabel="Clôture…">
          Confirmer
        </Submit>
      </div>
    </form>
  );
}
