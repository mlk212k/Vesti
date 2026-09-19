"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Alerte } from "@/components/alerte";
import { Submit } from "@/components/submit";
import { signInAction, type AuthState } from "./actions";

export function LoginForm({ next }: { next?: string }) {
  const [state, action] = useActionState<AuthState, FormData>(
    signInAction,
    undefined,
  );

  return (
    <form action={action} className="space-y-4">
      {next ? <input type="hidden" name="next" value={next} /> : null}

      <div>
        <label className="libelle" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          required
          className="champ"
          placeholder="prenom@exemple.fr"
        />
      </div>

      <div>
        <label className="libelle" htmlFor="password">
          Mot de passe
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="champ"
          placeholder="••••••••"
        />
      </div>

      {state?.error ? <Alerte>{state.error}</Alerte> : null}

      <Submit pendingLabel="Connexion…">Entrer</Submit>

      <p className="pt-1 text-center text-xs text-faint">
        <Link
          href="/mot-de-passe-oublie"
          className="transition-colors hover:text-dim"
        >
          Mot de passe oublié ?
        </Link>
      </p>
    </form>
  );
}
