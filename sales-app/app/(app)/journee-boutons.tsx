"use client";

import { useActionState, useState } from "react";
import { jouer } from "@/lib/sfx";
import { Alerte } from "@/components/alerte";
import { IconStop } from "@/components/icons";
import { Submit } from "@/components/submit";
import type { ActionResult } from "@/lib/errors";
import { endDayAction } from "./actions";

// Ouvrir sa journée se fait sur l'objet lui-même (appui long) : il n'y a
// plus de bouton pour ça. La CLÔTURE, en revanche, reste un bouton — c'est
// une action qu'on ne doit pas pouvoir déclencher en manipulant la carte
// par jeu, et elle est irréversible dans l'esprit du commercial. D'où la
// confirmation, et la note facultative qu'on en profite pour demander
// (« 3 commerces fermés », « pluie toute l'aprèm »). Un simple dépliement,
// pas une fenêtre modale : moins de code, et ça marche sans JavaScript
// chargé.
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
          className="btn w-full py-4"
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
        <Submit className="btn flex-[2] py-3" pendingLabel="Clôture…">
          Confirmer
        </Submit>
      </div>
    </form>
  );
}
