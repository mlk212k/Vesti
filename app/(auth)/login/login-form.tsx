"use client";

import { useEffect, useState } from "react";
import {
  adoptSession,
  createClient,
  createOtpClient,
} from "@/lib/supabase/client";
import { env } from "@/lib/env";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import {
  OTP_VERIFY_TYPES,
  RESEND_COOLDOWN_SECONDS,
  isOtpComplete,
  normalizeOtp,
  otpErrorMessage,
} from "@/lib/otp";

type Status =
  | { kind: "idle" }
  | { kind: "sending" }
  | { kind: "code"; email: string }
  | { kind: "verifying"; email: string }
  | { kind: "error"; message: string };

/**
 * Connexion par code à 6 chiffres.
 *
 * Sur iOS, une app installée sur l'écran d'accueil a son propre stockage,
 * séparé de Safari. Un lien de connexion s'ouvre depuis la boîte mail, donc
 * dans Safari, et y crée la session : l'app installée reste déconnectée, et
 * aucune API ne permet de franchir cette cloison. Le code, lui, se saisit à
 * l'intérieur de l'app — rien ne sort du conteneur.
 *
 * ⚠️ Le code n'arrive que si les modèles d'email Supabase contiennent
 * `{{ .Token }}` : « Magic Link » (adresse déjà inscrite) ET « Confirm signup »
 * (première connexion). N'en configurer qu'un casse la moitié des connexions —
 * et la moitié cassée est celle des nouveaux inscrits, la moins visible.
 *
 * ⚠️ L'envoi ET la vérification passent par `createOtpClient`, en flux
 * implicite. Avec le client PKCE par défaut, Supabase préfixe le jeton stocké
 * et le code devient invérifiable — il répond « code expiré » sur un code
 * parfaitement valide. Le détail est dans `lib/supabase/client.ts`.
 */
export function LoginForm({ next }: { next: string }) {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [codeError, setCodeError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  // Décompte avant de pouvoir redemander un code. Supabase refuse un second
  // envoi avant 60 s : autant afficher l'attente plutôt qu'une erreur.
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  /**
   * Origine réelle de la page, pas une valeur figée à la compilation.
   *
   * Le lien du mail doit ramener là où la personne se trouve vraiment. Une
   * variable d'environnement mal renseignée l'enverrait ailleurs — c'est
   * exactement ce qui s'est produit avec l'adresse par défaut du projet
   * Supabase, qui pointait sur localhost.
   */
  function currentOrigin(): string {
    return typeof window === "undefined" ? env.siteUrl : window.location.origin;
  }

  async function sendCode(address: string) {
    const supabase = createOtpClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: address,
      options: {
        shouldCreateUser: true,

        // Pas d'`emailRedirectTo` : le mail garde son lien, qui pointe vers
        // l'adresse configurée dans Supabase (Authentication → URL
        // Configuration). Ce qui compte ici, c'est le code — et c'est
        // `createOtpClient` qui garantit qu'il sera vérifiable.
      },
    });

    if (error) {
      setStatus({
        kind: "error",
        message: otpErrorMessage(error.message),
      });
      return false;
    }

    setCooldown(RESEND_COOLDOWN_SECONDS);
    return true;
  }

  async function requestCode(event: React.FormEvent) {
    event.preventDefault();
    const address = email.trim();
    setStatus({ kind: "sending" });
    if (await sendCode(address)) {
      setCode("");
      setStatus({ kind: "code", email: address });
    }
  }

  async function verifyCode(event: React.FormEvent) {
    event.preventDefault();
    if (status.kind !== "code") return;

    const address = status.email;
    setStatus({ kind: "verifying", email: address });

    // Même client qu'à l'envoi : c'est le mode du client qui décide de la
    // forme du jeton stocké, donc de la clé recherchée à la vérification.
    const supabase = createOtpClient();
    const token = normalizeOtp(code);

    // On essaie chaque type de jeton jusqu'à ce que l'un passe : Supabase ne
    // range pas le code au même endroit pour une adresse déjà inscrite et pour
    // une adresse neuve. Voir `OTP_VERIFY_TYPES`.
    let lastError: { message: string } | null = null;
    let session: { access_token: string; refresh_token: string } | null = null;

    for (const type of OTP_VERIFY_TYPES) {
      const { data, error } = await supabase.auth.verifyOtp({
        email: address,
        token,
        type,
      });
      if (!error && data.session) {
        lastError = null;
        session = data.session;
        break;
      }
      lastError = error ?? { message: "no_session" };
    }

    if (!session) {
      setStatus({ kind: "code", email: address });
      setCodeError(otpErrorMessage(lastError?.message));
      return;
    }

    // Le client OTP ne persiste rien : on pose la session sur le client à
    // cookies, seul lu par le proxy et les pages serveur. Si cette étape
    // échoue, inutile de naviguer — la page suivante renverrait ici.
    const adopted = await adoptSession(session);
    if (!adopted.ok) {
      setStatus({ kind: "code", email: address });
      setCodeError(
        "Connexion établie mais non enregistrée. Réessaie, ou vérifie que ton navigateur accepte les cookies."
      );
      return;
    }

    // Rechargement complet plutôt que `router.push` : le proxy et toutes les
    // pages serveur doivent être rendus avec le cookie de session tout juste
    // écrit. Un rendu client réutiliserait des payloads produits sans lui.
    window.location.replace(next);
  }

  async function signInWithGoogle() {
    setStatus({ kind: "sending" });
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${currentOrigin()}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    if (error) {
      setStatus({ kind: "error", message: "La connexion Google a échoué." });
    }
    // En cas de succès, le navigateur part chez Google : rien à faire ici.
  }

  /* ── Étape 2 : saisie du code ────────────────────────────────────────── */

  if (status.kind === "code" || status.kind === "verifying") {
    const verifying = status.kind === "verifying";

    return (
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2 text-center">
          <h2 className="text-lg font-bold">Entre ton code</h2>
          <p className="text-sm leading-relaxed text-muted">
            On a envoyé un code à 6 chiffres à{" "}
            <span className="font-semibold text-foreground">{status.email}</span>.
          </p>
        </div>

        <form onSubmit={verifyCode} className="flex flex-col gap-3">
          <Input
            // `one-time-code` est ce qui déclenche la proposition automatique
            // du code par iOS et Android au-dessus du clavier. Sans cet
            // attribut, il faut basculer vers la boîte mail et revenir.
            autoComplete="one-time-code"
            inputMode="numeric"
            pattern="[0-9]*"
            // Pas de `maxLength` : le navigateur l'applique au collage AVANT
            // notre nettoyage, donc « 123 456 » (7 caractères) arriverait
            // tronqué en « 123 45 », soit un code à 5 chiffres. C'est
            // `normalizeOtp` qui borne la valeur, une fois les espaces retirés.
            autoFocus
            required
            aria-label="Code à 6 chiffres"
            aria-invalid={codeError !== null}
            placeholder="000000"
            value={code}
            onChange={(event) => {
              setCode(normalizeOtp(event.target.value));
              setCodeError(null);
            }}
            className="text-center font-display text-[28px] font-extrabold tracking-[0.3em]"
          />

          {codeError && (
            <p role="alert" className="text-center text-sm text-danger">
              {codeError}
            </p>
          )}

          <Button type="submit" disabled={verifying || !isOtpComplete(code)}>
            {verifying ? "Vérification…" : "Me connecter"}
          </Button>
        </form>

        <div className="flex flex-col gap-1 text-center">
          <Button
            variant="ghost"
            disabled={cooldown > 0 || verifying}
            onClick={async () => {
              setCodeError(null);
              await sendCode(status.email);
            }}
          >
            {cooldown > 0
              ? `Renvoyer un code dans ${cooldown} s`
              : "Renvoyer un code"}
          </Button>
          <Button
            variant="ghost"
            disabled={verifying}
            onClick={() => {
              setCode("");
              setCodeError(null);
              setStatus({ kind: "idle" });
            }}
          >
            Utiliser une autre adresse
          </Button>
        </div>
      </div>
    );
  }

  /* ── Étape 1 : adresse email ─────────────────────────────────────────── */

  const sending = status.kind === "sending";

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={requestCode} className="flex flex-col gap-3">
        <Field label="Ton email">
          <Input
            type="email"
            inputMode="email"
            autoComplete="email"
            required
            placeholder="prenom@email.fr"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>
        <Button type="submit" disabled={sending || email.trim().length === 0}>
          {sending ? "Envoi…" : "Recevoir mon code"}
        </Button>
      </form>

      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-border" />
        <span className="text-xs text-muted">ou</span>
        <span className="h-px flex-1 bg-border" />
      </div>

      <Button variant="secondary" onClick={signInWithGoogle} disabled={sending}>
        Continuer avec Google
      </Button>

      {status.kind === "error" && (
        <p role="alert" className="text-center text-sm text-danger">
          {status.message}
        </p>
      )}
    </div>
  );
}
