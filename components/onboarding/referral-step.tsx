"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { submitReferralCode } from "@/app/(auth)/onboarding/actions";

const MESSAGES: Record<string, string> = {
  unknown_code: "Ce code n'est pas valide.",
  already_referred: "Un code est déjà enregistré sur ton compte.",
  empty_code: "Saisis un code ou passe cette étape.",
  error: "Impossible de vérifier ce code pour le moment.",
};

/**
 * Première étape de l'onboarding : le code d'invitation.
 *
 * Volontairement banal côté utilisateur — un simple champ « code », comme
 * partout ailleurs. Rien à l'écran n'indique à quoi sert l'attribution, et la
 * validation ne renvoie jamais à qui le code appartient.
 *
 * Pré-rempli depuis le cookie posé par proxy.ts quand l'arrivée se fait par un
 * lien `?ref=...`, mais toujours modifiable : beaucoup tapent le code de mémoire.
 */
export function ReferralStep({
  initialCode,
  onDone,
}: {
  initialCode: string;
  onDone: () => void;
}) {
  const [code, setCode] = useState(initialCode);
  const [error, setError] = useState<string | null>(null);
  const [accepted, setAccepted] = useState(false);
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await submitReferralCode(code);
      if (result.accepted) {
        setAccepted(true);
        setTimeout(onDone, 700);
        return;
      }
      setError(MESSAGES[result.reason ?? "error"] ?? MESSAGES.error);
    });
  }

  if (accepted) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-[var(--radius-card)] border border-border-soft bg-surface shadow-[var(--shadow-card)] p-6 text-center">
        <span className="text-3xl">✓</span>
        <p className="text-sm font-medium">Code validé</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <h1 className="text-[1.9rem] font-extrabold leading-[1.05]">Tu as un code ?</h1>
        <p className="text-sm leading-relaxed text-muted">
          Si on t&apos;a donné un code, saisis-le ici.
        </p>
      </div>

      <Field label="Code">
        <Input
          value={code}
          onChange={(event) => setCode(event.target.value.toUpperCase())}
          placeholder="Ton code"
          autoCapitalize="characters"
          autoComplete="off"
          maxLength={32}
        />
      </Field>

      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="flex flex-col gap-2">
        <Button onClick={submit} disabled={pending || code.trim().length === 0}>
          {pending ? "Vérification…" : "Valider le code"}
        </Button>
        <Button variant="ghost" onClick={onDone} disabled={pending}>
          Je n&apos;ai pas de code
        </Button>
      </div>
    </div>
  );
}
