"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { redeemStyleGift, submitStyleCode } from "@/app/(dashboard)/compte/actions";
import {
  STYLE_GIFT_MONTHS,
  STYLE_GIFT_THRESHOLD,
  STYLE_PER_REFERRAL,
  type StyleStatus,
} from "@/lib/style";

const MESSAGES: Record<string, string> = {
  not_enough_style: `Il te faut ${STYLE_GIFT_THRESHOLD} Style.`,
  error: "Impossible d'échanger pour le moment. Réessaie dans un instant.",
};

/**
 * Le parrainage, vu du client.
 *
 * L'écran répond à trois questions, dans cet ordre : combien j'ai, comment j'en
 * gagne, et qu'est-ce que j'en fais. Le solde est en gros parce que c'est ce
 * qu'on revient vérifier ; le code est juste dessous parce que c'est la seule
 * chose qu'on vient y chercher pour agir.
 */
export function StyleCard({ status, siteUrl }: { status: StyleStatus; siteUrl: string }) {
  const [copied, setCopied] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [until, setUntil] = useState<string | null>(status.giftUntil);
  const [balance, setBalance] = useState(status.balance);
  const [referred, setReferred] = useState(status.referred);
  const [pending, startTransition] = useTransition();

  const link = status.code ? `${siteUrl}/?ref=${status.code}` : siteUrl;
  const canRedeem = balance >= STYLE_GIFT_THRESHOLD;
  const progress = Math.min(100, Math.round((balance / STYLE_GIFT_THRESHOLD) * 100));

  async function share() {
    const text = `Vesti note ta tenue et te dit quoi améliorer. Mon code : ${status.code}`;

    // `navigator.share` ouvre la feuille de partage native — c'est le chemin le
    // plus court vers une story ou une conversation, donc vers un vrai filleul.
    // Absent sur desktop : on retombe sur le presse-papier.
    if (navigator.share) {
      try {
        await navigator.share({ text, url: link });
        return;
      } catch {
        // Partage annulé : rien à signaler, l'utilisateur a fermé la feuille.
        return;
      }
    }

    try {
      await navigator.clipboard.writeText(`${text}\n${link}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setMessage("Copie impossible : sélectionne le code à la main.");
    }
  }

  function redeem() {
    setMessage(null);
    startTransition(async () => {
      const result = await redeemStyleGift();
      if (result.accepted) {
        setUntil(result.until);
        setBalance((current) => current - STYLE_GIFT_THRESHOLD);
        return;
      }
      setMessage(MESSAGES[result.reason ?? "error"] ?? MESSAGES.error);
    });
  }

  return (
    <section className="flex flex-col gap-5 rounded-[var(--radius-card)] border border-border-soft bg-surface p-5 shadow-[var(--shadow-card)]">
      <div className="flex flex-col gap-1">
        <h2 className="text-sm font-semibold">Parrainage</h2>
        <p className="text-xs leading-relaxed text-muted">
          Chaque personne qui utilise ton code et analyse une tenue te rapporte{" "}
          {STYLE_PER_REFERRAL} Style. À {STYLE_GIFT_THRESHOLD}, tu passes{" "}
          {STYLE_GIFT_MONTHS} mois en Styliste, offerts.
        </p>
      </div>

      {/* Le solde : le chiffre qu'on revient regarder. */}
      <div className="flex items-baseline gap-2">
        <span className="font-[family-name:var(--font-bricolage)] text-[2.6rem] font-extrabold leading-none text-accent-strong">
          {balance}
        </span>
        <span className="text-sm font-semibold text-muted">
          Style sur {STYLE_GIFT_THRESHOLD}
        </span>
      </div>

      <div
        className="h-2 w-full overflow-hidden rounded-full bg-accent-soft"
        role="progressbar"
        aria-valuenow={balance}
        aria-valuemin={0}
        aria-valuemax={STYLE_GIFT_THRESHOLD}
        aria-label={`${balance} Style sur ${STYLE_GIFT_THRESHOLD}`}
      >
        <div
          className="h-full rounded-full bg-accent transition-[width] duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Deux compteurs distincts : sans ça, celui qui a parrainé cinq personnes
          et n'a que 20 Style croit à un bug. L'écart s'explique de lui-même. */}
      <dl className="flex gap-6 text-xs">
        <div className="flex flex-col gap-0.5">
          <dt className="text-muted">Filleuls actifs</dt>
          <dd className="text-sm font-semibold">{status.confirmedReferrals}</dd>
        </div>
        {status.pendingReferrals > 0 && (
          <div className="flex flex-col gap-0.5">
            <dt className="text-muted">En attente d&apos;une 1re analyse</dt>
            <dd className="text-sm font-semibold">{status.pendingReferrals}</dd>
          </div>
        )}
      </dl>

      {status.code && (
        <div className="flex flex-col gap-2">
          <span className="text-xs font-semibold text-muted">Ton code</span>
          <div className="flex items-center justify-between gap-3 rounded-[18px] bg-surface-sunken px-4 py-3">
            {/* Chiffres tabulaires et lettres espacées : ce code se recopie
                depuis une story, souvent de mémoire. */}
            <span className="font-[family-name:var(--font-bricolage)] text-xl font-extrabold tracking-[0.18em] tabular-nums">
              {status.code}
            </span>
            <button
              type="button"
              onClick={share}
              style={{ touchAction: "manipulation" }}
              className="shrink-0 rounded-full bg-accent px-4 py-2 text-xs font-semibold text-accent-foreground transition active:scale-[0.98]"
            >
              {copied ? "Copié" : "Partager"}
            </button>
          </div>
        </div>
      )}

      {until ? (
        <p className="rounded-[18px] bg-accent-soft px-4 py-3 text-xs font-semibold text-accent-strong">
          Styliste offert jusqu&apos;au{" "}
          {new Date(until).toLocaleDateString("fr-FR", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </p>
      ) : null}

      {canRedeem && (
        <Button onClick={redeem} disabled={pending}>
          {pending
            ? "Échange en cours…"
            : `Échanger ${STYLE_GIFT_THRESHOLD} Style contre ${STYLE_GIFT_MONTHS} mois`}
        </Button>
      )}

      {message && <p className="text-sm text-danger">{message}</p>}

      {/* L'étape d'onboarding se passe, et l'attribution est définitive : sans
          ce second point d'entrée, celui qui l'a passée puis reçu le code d'un
          ami n'aurait plus jamais moyen de s'en servir. */}
      {!referred && <FriendCode onAccepted={() => setReferred(true)} />}
    </section>
  );
}

const CODE_MESSAGES: Record<string, string> = {
  unknown_code: "Ce code n'existe pas.",
  already_referred: "Un code est déjà enregistré sur ton compte.",
  self_referral: "C'est ton propre code.",
  error: "Impossible de vérifier ce code pour le moment.",
};

function FriendCode({ onAccepted }: { onAccepted: () => void }) {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{ touchAction: "manipulation" }}
        className="self-start text-xs font-semibold text-accent-strong underline underline-offset-2"
      >
        J&apos;ai le code d&apos;un ami
      </button>
    );
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await submitStyleCode(code);
      if (result.accepted) {
        onAccepted();
        return;
      }
      setError(CODE_MESSAGES[result.reason ?? "error"] ?? CODE_MESSAGES.error);
    });
  }

  return (
    <div className="flex flex-col gap-3 border-t border-border-soft pt-4">
      <Field label="Code d'un ami">
        <Input
          value={code}
          onChange={(event) => setCode(event.target.value.toUpperCase())}
          placeholder="ABC123"
          autoCapitalize="characters"
          autoComplete="off"
          maxLength={32}
        />
      </Field>
      {error && <p className="text-sm text-danger">{error}</p>}
      <Button
        variant="secondary"
        onClick={submit}
        disabled={pending || code.trim().length === 0}
      >
        {pending ? "Vérification…" : "Valider"}
      </Button>
    </div>
  );
}
