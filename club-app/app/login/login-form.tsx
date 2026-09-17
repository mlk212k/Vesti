"use client";

import { useActionState } from "react";
import { signInAction, signUpAction, type AuthResult } from "./actions";

export function LoginForm({
  isSignUp,
  next,
}: {
  isSignUp: boolean;
  next?: string;
}) {
  const action = isSignUp ? signUpAction : signInAction;
  const [state, formAction, pending] = useActionState<AuthResult, FormData>(
    action,
    undefined,
  );

  return (
    <form action={formAction} className="space-y-4">
      {next ? <input type="hidden" name="next" value={next} /> : null}

      {isSignUp && (
        <label className="block space-y-1">
          <span className="text-sm text-muted">Nom complet</span>
          <input
            required
            name="full_name"
            autoComplete="name"
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </label>
      )}

      <label className="block space-y-1">
        <span className="text-sm text-muted">Email</span>
        <input
          required
          type="email"
          name="email"
          autoComplete="email"
          className="w-full rounded-lg border border-border bg-surface px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
        />
      </label>

      <label className="block space-y-1">
        <span className="text-sm text-muted">Mot de passe</span>
        <input
          required
          minLength={6}
          type="password"
          name="password"
          autoComplete={isSignUp ? "new-password" : "current-password"}
          className="w-full rounded-lg border border-border bg-surface px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
        />
      </label>

      {state?.error && (
        <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-accent px-4 py-2.5 font-medium text-black hover:bg-accent-strong transition disabled:opacity-60"
      >
        {pending
          ? "…"
          : isSignUp
            ? "Créer mon compte"
            : "Se connecter"}
      </button>
    </form>
  );
}
