"use client";

import { useActionState, useState } from "react";
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
  const [role, setRole] = useState<"member" | "coach">("member");

  return (
    <form action={formAction} className="space-y-4">
      {next ? <input type="hidden" name="next" value={next} /> : null}

      {isSignUp && (
        <>
          <label className="block space-y-1">
            <span className="text-sm text-muted">Nom complet</span>
            <input
              required
              name="full_name"
              autoComplete="name"
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </label>

          <div className="space-y-1.5">
            <span className="text-sm text-muted">Tu es…</span>
            <input type="hidden" name="role" value={role} />
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setRole("member")}
                className={`rounded-lg border px-3 py-2.5 text-left text-sm transition ${
                  role === "member"
                    ? "border-accent bg-accent/5"
                    : "border-border bg-surface"
                }`}
              >
                <div className="font-medium">Membre</div>
                <div className="text-xs text-muted">
                  Calendrier, chat, annonces
                </div>
              </button>
              <button
                type="button"
                onClick={() => setRole("coach")}
                className={`rounded-lg border px-3 py-2.5 text-left text-sm transition ${
                  role === "coach"
                    ? "border-accent bg-accent/5"
                    : "border-border bg-surface"
                }`}
              >
                <div className="font-medium">Coach</div>
                <div className="text-xs text-muted">
                  + créer des événements et des annonces
                </div>
              </button>
            </div>
          </div>
        </>
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
        <p className="rounded-lg border border-accent/30 bg-accent/5 px-3 py-2 text-sm text-accent-strong">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-accent px-4 py-2.5 font-medium text-white hover:bg-accent-strong transition disabled:opacity-60"
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
