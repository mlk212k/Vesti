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
              className="clay-creux w-full px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-accent/60"
            />
          </label>

          <div className="space-y-1.5">
            <span className="text-sm text-muted">Tu es…</span>
            <input type="hidden" name="role" value={role} />
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setRole("member")}
                className={`clay-presse rounded-2xl px-3 py-2.5 text-left text-sm transition ${
                  role === "member"
                    ? "clay ring-2 ring-accent/50"
                    : "clay-creux"
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
                className={`clay-presse rounded-2xl px-3 py-2.5 text-left text-sm transition ${
                  role === "coach"
                    ? "clay ring-2 ring-gold/60"
                    : "clay-creux"
                }`}
              >
                <div className="font-medium">Coach</div>
                <div className="text-xs text-muted">
                  + événements, annonces, retirer un membre
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
          className="clay-creux w-full px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-accent/60"
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
          className="clay-creux w-full px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-accent/60"
        />
      </label>

      {state?.error && (
        <p className="rounded-2xl bg-accent/8 px-3 py-2.5 text-sm text-accent-strong ring-1 ring-accent/15">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="clay-accent clay-presse w-full py-3 font-medium disabled:opacity-60"
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
