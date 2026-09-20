"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Alerte } from "@/components/alerte";
import { Submit } from "@/components/submit";
import { requestPasswordResetAction, type ResetState } from "../login/actions";

export function ResetForm() {
  const [state, action] = useActionState<ResetState, FormData>(
    requestPasswordResetAction,
    undefined,
  );

  if (state && "sent" in state) {
    return (
      <div className="space-y-4">
        <Alerte ton="succes">
          Si un compte existe avec cette adresse, un lien de réinitialisation
          vient d&apos;être envoyé. Pense à regarder les spams.
        </Alerte>
        <Link href="/login" className="btn btn-fantome w-full">
          Retour à la connexion
        </Link>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <div>
        <label className="libelle" htmlFor="email">
          Email du compte
        </label>
        <input
          id="email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="username"
          autoCapitalize="none"
          required
          className="champ"
          placeholder="prenom@exemple.fr"
        />
      </div>

      {state && "error" in state ? <Alerte>{state.error}</Alerte> : null}

      <Submit pendingLabel="Envoi…">Envoyer le lien</Submit>

      <p className="pt-1 text-center text-sm text-faint">
        <Link href="/login" className="transition-colors hover:text-dim">
          Revenir à la connexion
        </Link>
      </p>
    </form>
  );
}
