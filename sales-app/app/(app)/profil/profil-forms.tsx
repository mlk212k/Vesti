"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";
import { Alerte } from "@/components/alerte";
import { Submit } from "@/components/submit";
import type { ActionResult } from "@/lib/errors";
import type { SessionUser } from "@/lib/auth";
import { changePasswordAction, updateProfileAction } from "./actions";

export function ProfilForm({ user }: { user: SessionUser }) {
  const router = useRouter();
  const [state, action] = useActionState<ActionResult | undefined, FormData>(
    updateProfileAction,
    undefined,
  );

  useEffect(() => {
    if (state?.ok) router.refresh();
  }, [state, router]);

  return (
    <form action={action} className="panneau space-y-4 p-5">
      <h2 className="titre text-lg">Mes informations</h2>

      <div>
        <label className="libelle" htmlFor="full_name">
          Nom complet
        </label>
        <input
          id="full_name"
          name="full_name"
          required
          defaultValue={user.full_name}
          className="champ"
        />
      </div>

      <div>
        <label className="libelle" htmlFor="phone">
          Téléphone
        </label>
        <input
          id="phone"
          name="phone"
          type="tel"
          defaultValue={user.phone ?? ""}
          className="champ"
        />
      </div>

      <div>
        <span className="libelle">Email</span>
        <p className="panneau-creux px-3.5 py-2.5 text-sm text-faint">
          {user.email ?? "—"}
        </p>
        <p className="mt-1.5 text-sm text-faint">
          Seul le chef peut changer l&apos;email d&apos;un compte.
        </p>
      </div>

      {state?.ok ? <Alerte ton="succes">Profil mis à jour.</Alerte> : null}
      {state && !state.ok ? <Alerte>{state.error}</Alerte> : null}

      <Submit className="btn btn-primaire w-full py-3" pendingLabel="…">
        Enregistrer
      </Submit>
    </form>
  );
}

export function PasswordForm() {
  const [state, action] = useActionState<ActionResult | undefined, FormData>(
    changePasswordAction,
    undefined,
  );

  return (
    <form action={action} className="panneau space-y-4 p-5">
      <h2 className="titre text-lg">Mot de passe</h2>

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

      {state?.ok ? <Alerte ton="succes">Mot de passe modifié.</Alerte> : null}
      {state && !state.ok ? <Alerte>{state.error}</Alerte> : null}

      <Submit className="btn w-full py-3" pendingLabel="…">
        Changer le mot de passe
      </Submit>
    </form>
  );
}
