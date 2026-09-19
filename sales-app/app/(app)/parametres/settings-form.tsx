"use client";

import { useActionState } from "react";
import { Alerte } from "@/components/alerte";
import { Submit } from "@/components/submit";
import type { ActionResult } from "@/lib/errors";
import type { AppSettings } from "@/lib/types";
import { updateSettingsAction } from "./actions";

export function SettingsForm({ settings }: { settings: AppSettings }) {
  const [state, action] = useActionState<ActionResult | undefined, FormData>(
    updateSettingsAction,
    undefined,
  );

  return (
    <form action={action} className="panneau space-y-5 p-5">
      <div>
        <label className="libelle" htmlFor="team_name">
          Nom de l&apos;équipe
        </label>
        <input
          id="team_name"
          name="team_name"
          required
          defaultValue={settings.team_name}
          className="champ"
        />
      </div>

      <div>
        <label className="libelle" htmlFor="commission_rate">
          Commission du chef (%)
        </label>
        <input
          id="commission_rate"
          name="commission_rate"
          inputMode="decimal"
          required
          defaultValue={(settings.commission_rate_bp / 100).toString()}
          className="champ chiffre text-xl"
        />
        <p className="mt-1.5 text-xs text-faint">
          Appliquée à chaque nouvelle vente. Les ventes déjà enregistrées
          gardent le taux qui avait cours au moment où elles ont été faites —
          changer ce nombre ne réécrit jamais le passé.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="libelle" htmlFor="default_daily_goal">
            Objectif quotidien
          </label>
          <input
            id="default_daily_goal"
            name="default_daily_goal"
            type="number"
            min={1}
            required
            defaultValue={settings.default_daily_goal}
            className="champ chiffre text-xl"
          />
          <p className="mt-1.5 text-xs text-faint">
            Valeur par défaut. Un objectif personnel défini sur une fiche
            membre passe devant.
          </p>
        </div>

        <div>
          <label className="libelle" htmlFor="default_card_price">
            Prix par carte (€)
          </label>
          <input
            id="default_card_price"
            name="default_card_price"
            inputMode="decimal"
            required
            defaultValue={(settings.default_card_price_cents / 100).toString()}
            className="champ chiffre text-xl"
          />
          <p className="mt-1.5 text-xs text-faint">
            Pré-remplit le formulaire de vente ; le commercial peut le changer
            au cas par cas.
          </p>
        </div>
      </div>

      <div>
        <label className="libelle" htmlFor="missed_goal_penalty">
          Retenue suggérée si objectif manqué (€)
        </label>
        <input
          id="missed_goal_penalty"
          name="missed_goal_penalty"
          inputMode="decimal"
          defaultValue={(settings.missed_goal_penalty_cents / 100).toString()}
          className="champ"
        />
        <p className="mt-1.5 text-xs text-faint">
          Ce montant n&apos;est JAMAIS prélevé automatiquement. Il est proposé
          au manager au moment de valider une journée, qui peut l&apos;appliquer,
          le modifier ou le laisser à zéro. Mets 0 pour ne rien suggérer.
        </p>
      </div>

      {state?.ok ? <Alerte ton="succes">Paramètres enregistrés.</Alerte> : null}
      {state && !state.ok ? <Alerte>{state.error}</Alerte> : null}

      <Submit className="btn btn-primaire w-full py-3.5" pendingLabel="…">
        Enregistrer
      </Submit>
    </form>
  );
}
