"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { submitReferralCode } from "@/app/(auth)/onboarding/actions";

const MESSAGES: Record<string, string> = {
  unknown_code: "Ce code n'est pas valide.",
  already_referred: "Un code est déjà enregistré sur ton compte.",
  self_referral: "C'est ton propre code.",
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
 * ── Pourquoi un code venu d'un lien se valide TOUT SEUL ─────────────────────
 *
 * Avant, le code capté par `?ref=...` était seulement pré-rempli : il fallait
 * encore appuyer sur « Valider le code ». Or juste en dessous se trouve
 * « Je n'ai pas de code », et le trafic vient de TikTok — des gens qui
 * traversent l'onboarding au plus vite. Un seul appui à côté, et le partenaire
 * qui a réellement amené la personne ne touchait rien. Silencieusement : ni
 * erreur, ni trace, et une commission perdue que personne ne pouvait constater.
 *
 * Désormais, quand le code vient du lien, il est envoyé dès l'affichage et
 * l'étape est franchie sans rien demander. Le champ manuel reste intact pour
 * qui arrive sans lien et tape son code de mémoire.
 *
 * ⚠️ L'échec d'une validation automatique ne s'affiche jamais en erreur : la
 * personne n'a rien tapé, lui reprocher un code invalide n'aurait aucun sens.
 * On retombe simplement sur le champ manuel.
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

  /* Un code pré-rempli vient forcément d'un lien partenaire : on le tente avant
     d'afficher quoi que ce soit, pour ne pas laisser voir un formulaire que la
     personne n'aura pas à remplir. */
  const [autoRunning, setAutoRunning] = useState(initialCode.trim().length > 0);

  // Garde-fou : en mode strict, React monte les effets deux fois. Sans ce
  // verrou, le code partirait en double — sans dommage en base (la deuxième
  // tentative répondrait `already_referred`), mais avec un appel inutile.
  const autoDone = useRef(false);

  /* Ne touche à aucun état de façon synchrone : c'est ce qui permet de
     l'appeler depuis l'effet de montage sans déclencher de rendu en cascade.
     Tous les `setState` ci-dessous partent après l'`await`. */
  function runValidation(value: string, auto: boolean) {
    startTransition(async () => {
      const result = await submitReferralCode(value);

      if (result.accepted) {
        setAutoRunning(false);
        setAccepted(true);
        setTimeout(onDone, 700);
        return;
      }

      if (auto) {
        // Le compte porte déjà une attribution : l'étape n'a plus d'objet.
        if (result.reason === "already_referred") {
          setAutoRunning(false);
          onDone();
          return;
        }

        // Échec silencieux : on rend la main au champ manuel. Un code qui est
        // le sien n'a aucune raison de rester affiché.
        if (result.reason === "self_referral") setCode("");
        setAutoRunning(false);
        return;
      }

      setError(MESSAGES[result.reason ?? "error"] ?? MESSAGES.error);
    });
  }

  /* Saisie manuelle : on efface l'erreur précédente avant de repartir. Ici on
     est dans un gestionnaire d'événement, donc `setState` ne pose aucun
     problème de rendu. */
  function submitManually() {
    setError(null);
    runValidation(code, false);
  }

  useEffect(() => {
    if (autoDone.current) return;
    autoDone.current = true;

    const fromLink = initialCode.trim();
    if (fromLink.length === 0) return;

    runValidation(fromLink, true);
    // Au montage uniquement : `initialCode` est figé pour la durée de l'étape.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (accepted) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-[var(--radius-card)] border border-border-soft bg-surface p-6 text-center">
        <span className="text-3xl">✓</span>
        <p className="text-sm font-medium">Code validé</p>
      </div>
    );
  }

  /* Validation automatique en cours. On n'affiche surtout pas le formulaire :
     il disparaîtrait aussitôt, et cet aller-retour donnerait l'impression d'un
     écran raté. */
  if (autoRunning) {
    return (
      <div
        className="flex flex-col items-center gap-2 rounded-[var(--radius-card)] border border-border-soft bg-surface p-6 text-center"
        role="status"
        aria-live="polite"
      >
        <p className="text-sm text-muted">Un instant…</p>
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
        <Button onClick={submitManually} disabled={pending || code.trim().length === 0}>
          {pending ? "Vérification…" : "Valider le code"}
        </Button>
        <Button variant="ghost" onClick={onDone} disabled={pending}>
          Je n&apos;ai pas de code
        </Button>
      </div>
    </div>
  );
}
