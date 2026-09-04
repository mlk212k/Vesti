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
import { PASSWORD_MIN_LENGTH, authErrorMessage, passwordProblem } from "@/lib/password";
import { GoogleIcon } from "@/components/brand/social-icons";

/**
 * Connexion par mot de passe.
 *
 * Le mot de passe a remplacé le code par email comme porte d'entrée, et la
 * raison est mesurée : sur les cinq premiers inscrits, deux ne sont jamais
 * entrés, et les délais de réception allaient de 17 secondes à près de 8
 * heures. Tant que les emails partent d'une adresse dont on ne possède pas le
 * domaine, les serveurs de réception les retiennent — et une connexion qui
 * dépend d'un email est une connexion qui dépend de ce délai.
 *
 * Un mot de passe se saisit sur place. Rien à attendre, rien à aller chercher
 * dans une autre application — ce qui compte double dans une app installée sur
 * l'écran d'accueil, d'où sortir coûte un aller-retour.
 *
 * ⚠️ Le code par email n'a PAS disparu : il est devenu le chemin de
 * récupération. C'est volontaire. Le lien de réinitialisation que propose
 * Supabase s'ouvre depuis la boîte mail, donc dans Safari, alors que l'app
 * installée a son propre stockage : la session atterrirait à côté de l'app.
 * Le code, lui, se saisit à l'intérieur. C'est aussi par là que passent les
 * comptes créés avant ce changement, qui n'ont pas encore de mot de passe.
 */
type Mode = "signin" | "signup";

type Status =
  | { kind: "idle" }
  | { kind: "busy" }
  | { kind: "error"; message: string }
  // Récupération : saisie du code, puis choix d'un nouveau mot de passe.
  | { kind: "code"; email: string }
  | { kind: "verifying"; email: string }
  | { kind: "reset" };

export function LoginForm({ next }: { next: string }) {
  const [mode, setMode] = useState<Mode>("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
   * Origine réelle de la page, pas une valeur figée à la compilation : une
   * variable d'environnement mal renseignée renverrait Google ailleurs.
   */
  function currentOrigin(): string {
    return typeof window === "undefined" ? env.siteUrl : window.location.origin;
  }

  /**
   * Rechargement complet plutôt que `router.push` : le proxy et toutes les
   * pages serveur doivent être rendus avec le cookie de session tout juste
   * écrit. Un rendu client réutiliserait des payloads produits sans lui.
   */
  function enterApp() {
    window.location.replace(next);
  }

  /* ── Mot de passe ──────────────────────────────────────────────────── */

  async function submitPassword(event: React.FormEvent) {
    event.preventDefault();
    const address = email.trim();

    const problem = mode === "signup" ? passwordProblem(password) : null;
    if (problem) {
      setStatus({ kind: "error", message: problem });
      return;
    }

    setStatus({ kind: "busy" });
    const supabase = createClient();

    if (mode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({
        email: address,
        password,
      });
      if (error) {
        setStatus({ kind: "error", message: authErrorMessage(error.message) });
        return;
      }
      enterApp();
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email: address,
      password,
      options: { emailRedirectTo: `${currentOrigin()}/auth/callback` },
    });

    if (error) {
      setStatus({ kind: "error", message: authErrorMessage(error.message) });
      return;
    }

    // Deux issues selon le réglage « Confirm email » de Supabase. Avec une
    // session, on entre tout de suite. Sans, le compte existe mais attend un
    // email — le pire des cas ici, donc on le dit franchement au lieu de
    // laisser la personne devant un écran qui ne bouge plus.
    if (data.session) {
      enterApp();
      return;
    }

    setStatus({
      kind: "error",
      message:
        "Compte créé. Il faut confirmer ton adresse : ouvre le mail qu'on vient de t'envoyer.",
    });
  }

  /* ── Récupération par code ─────────────────────────────────────────── */

  async function sendCode(address: string) {
    // Client en flux implicite : avec le client PKCE par défaut, Supabase
    // préfixe le jeton stocké et le code devient invérifiable — il répond
    // « code expiré » sur un code parfaitement valide. Détail dans
    // `lib/supabase/client.ts`.
    const supabase = createOtpClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: address,
      options: { shouldCreateUser: false },
    });

    if (error) {
      setStatus({ kind: "error", message: otpErrorMessage(error.message) });
      return false;
    }

    setCooldown(RESEND_COOLDOWN_SECONDS);
    return true;
  }

  async function startRecovery() {
    const address = email.trim();
    if (address.length === 0) {
      setStatus({ kind: "error", message: "Saisis ton email d'abord." });
      return;
    }
    setStatus({ kind: "busy" });
    if (await sendCode(address)) {
      setCode("");
      setCodeError(null);
      setStatus({ kind: "code", email: address });
    }
  }

  async function verifyCode(event: React.FormEvent) {
    event.preventDefault();
    if (status.kind !== "code") return;

    const address = status.email;
    setStatus({ kind: "verifying", email: address });

    const supabase = createOtpClient();
    const token = normalizeOtp(code);

    // Supabase ne range pas le code au même endroit pour une adresse déjà
    // inscrite et pour une adresse neuve : on essaie chaque type.
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
    // cookies, seul lu par le proxy et les pages serveur.
    const adopted = await adoptSession(session);
    if (!adopted.ok) {
      setStatus({ kind: "code", email: address });
      setCodeError(
        "Connexion établie mais non enregistrée. Réessaie, ou vérifie que ton navigateur accepte les cookies."
      );
      return;
    }

    // Connectée, mais toujours sans mot de passe utilisable : on lui en fait
    // choisir un tout de suite. La renvoyer dans l'app la ramènerait ici à la
    // prochaine connexion.
    setPassword("");
    setStatus({ kind: "reset" });
  }

  async function saveNewPassword(event: React.FormEvent) {
    event.preventDefault();
    const problem = passwordProblem(password);
    if (problem) {
      setCodeError(problem);
      return;
    }

    setCodeError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setCodeError(authErrorMessage(error.message));
      return;
    }
    enterApp();
  }

  async function signInWithGoogle() {
    setStatus({ kind: "busy" });
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

  /* ── Écran : nouveau mot de passe ──────────────────────────────────── */

  if (status.kind === "reset") {
    return (
      <form onSubmit={saveNewPassword} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2 text-center">
          <h2 className="text-lg font-bold">Choisis ton mot de passe</h2>
          <p className="text-sm leading-relaxed text-muted">
            Il te servira à te reconnecter, sans passer par ta boîte mail.
          </p>
        </div>

        <Field label="Nouveau mot de passe">
          <Input
            type="password"
            autoComplete="new-password"
            autoFocus
            required
            placeholder={`${PASSWORD_MIN_LENGTH} caractères minimum`}
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              setCodeError(null);
            }}
          />
        </Field>

        {codeError && (
          <p role="alert" className="text-center text-sm text-danger">
            {codeError}
          </p>
        )}

        <Button type="submit">Enregistrer et continuer</Button>
      </form>
    );
  }

  /* ── Écran : saisie du code de récupération ────────────────────────── */

  if (status.kind === "code" || status.kind === "verifying") {
    const verifying = status.kind === "verifying";

    return (
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2 text-center">
          <h2 className="text-lg font-bold">Entre ton code</h2>
          <p className="text-sm leading-relaxed text-muted">
            On a envoyé un code à{" "}
            <span className="font-semibold text-foreground">{status.email}</span>.
            Il peut mettre quelques minutes à arriver.
          </p>
        </div>

        <form onSubmit={verifyCode} className="flex flex-col gap-3">
          <Input
            // `one-time-code` déclenche la proposition automatique du code par
            // iOS et Android au-dessus du clavier.
            autoComplete="one-time-code"
            inputMode="numeric"
            pattern="[0-9]*"
            // Pas de `maxLength` : le navigateur l'applique au collage AVANT
            // notre nettoyage, donc « 123 456 » arriverait tronqué. C'est
            // `normalizeOtp` qui borne la valeur, espaces retirés.
            autoFocus
            required
            aria-label="Code reçu par email"
            aria-invalid={codeError !== null}
            placeholder="Ton code"
            value={code}
            onChange={(event) => {
              setCode(normalizeOtp(event.target.value));
              setCodeError(null);
            }}
            className="text-center font-display text-[26px] font-extrabold tracking-[0.22em]"
          />

          {codeError && (
            <p role="alert" className="text-center text-sm text-danger">
              {codeError}
            </p>
          )}

          <Button type="submit" disabled={verifying || !isOtpComplete(code)}>
            {verifying ? "Vérification…" : "Valider"}
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
            {cooldown > 0 ? `Renvoyer un code dans ${cooldown} s` : "Renvoyer un code"}
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
            Revenir en arrière
          </Button>
        </div>
      </div>
    );
  }

  /* ── Écran : email + mot de passe ──────────────────────────────────── */

  const busy = status.kind === "busy";
  const signup = mode === "signup";

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={submitPassword} className="flex flex-col gap-3">
        <Field label="Ton email">
          <Input
            type="email"
            inputMode="email"
            autoComplete="email"
            required
            placeholder="prenom@email.fr"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </Field>

        <Field label="Ton mot de passe">
          <Input
            type="password"
            // Distinguer les deux valeurs indique au gestionnaire de mots de
            // passe s'il doit en proposer un nouveau ou remplir l'existant.
            autoComplete={signup ? "new-password" : "current-password"}
            required
            placeholder={signup ? `${PASSWORD_MIN_LENGTH} caractères minimum` : "Ton mot de passe"}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </Field>

        <Button
          type="submit"
          disabled={busy || email.trim().length === 0 || password.length === 0}
        >
          {busy ? "Un instant…" : signup ? "Créer mon compte" : "Me connecter"}
        </Button>
      </form>

      {status.kind === "error" && (
        <p role="alert" className="text-center text-sm text-danger">
          {status.message}
        </p>
      )}

      <div className="flex flex-col items-center gap-1">
        <button
          type="button"
          onClick={() => {
            setMode(signup ? "signin" : "signup");
            setStatus({ kind: "idle" });
          }}
          style={{ touchAction: "manipulation" }}
          className="text-sm font-semibold text-accent-strong underline underline-offset-2"
        >
          {signup ? "J'ai déjà un compte" : "Créer un compte"}
        </button>

        {/* Aussi le chemin des comptes créés avant le mot de passe : ils n'en
            ont pas encore, et c'est ici qu'ils s'en donnent un. */}
        <button
          type="button"
          onClick={startRecovery}
          disabled={busy}
          style={{ touchAction: "manipulation" }}
          className="text-xs text-muted underline underline-offset-2 disabled:opacity-40"
        >
          Mot de passe oublié
        </button>
      </div>

      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-border" />
        <span className="text-xs text-muted">ou</span>
        <span className="h-px flex-1 bg-border" />
      </div>

      <Button variant="secondary" onClick={signInWithGoogle} disabled={busy}>
        <GoogleIcon />
        Continuer avec Google
      </Button>
    </div>
  );
}
