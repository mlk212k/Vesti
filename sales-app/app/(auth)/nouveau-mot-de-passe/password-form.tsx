"use client";

import { useActionState } from "react";
import { Alerte } from "@/components/alerte";
import { Submit } from "@/components/submit";
import { updatePasswordAction, type UpdatePasswordState } from "../login/actions";

export function PasswordForm() {
  const [state, action] = useActionState<UpdatePasswordState, FormData>(
    updatePasswordAction,
    undefined,
  );

  return (
    <form action={action} className="space-y-4">
      <div>
        <label className="libelle" htmlFor="password">
          Nouveau mot de passe
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          className="champ"
          placeholder="8 caractères minimum"
        />
      </div>

      <div>
        <label className="libelle" htmlFor="confirm">
          Confirmation
        </label>
        <input
          id="confirm"
          name="confirm"
          type="password"
          autoComplete="new-password"
          required
          className="champ"
        />
      </div>

      {state?.error ? <Alerte>{state.error}</Alerte> : null}

      <Submit pendingLabel="Enregistrement…">Valider</Submit>
    </form>
  );
}
