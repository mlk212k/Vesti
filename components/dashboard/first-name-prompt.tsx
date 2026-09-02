"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { saveFirstName } from "@/app/(dashboard)/dashboard/actions";

/** Clé du « plus tard ». Par navigateur : refuser ici n'engage pas le compte. */
const DISMISSED_KEY = "vesti_first_name_dismissed";

/**
 * Demande le prénom aux comptes qui n'en ont pas.
 *
 * L'onboarding pose la question depuis peu, mais il ne se rejoue pas : sans ce
 * second point d'entrée, les comptes créés avant n'auraient jamais l'occasion
 * de répondre.
 *
 * Posée sur l'accueil plutôt qu'en interstitiel : personne n'ouvre l'app pour
 * remplir un formulaire, et bloquer le passage sur une information facultative
 * coûterait plus de départs qu'elle ne vaut. D'où aussi le « plus tard », qui
 * range la carte pour de bon sur cet appareil — redemander à chaque ouverture
 * ce qu'on a déjà refusé une fois, c'est du harcèlement.
 */
export function FirstNamePrompt() {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [hidden, setHidden] = useState(() => {
    // Lu à l'initialisation plutôt que dans un effet : sur un rendu client, ça
    // évite que la carte apparaisse puis disparaisse sous les yeux.
    try {
      return localStorage.getItem(DISMISSED_KEY) === "1";
    } catch {
      // Navigation privée, stockage bloqué : on montre la carte. Mieux vaut
      // reposer la question que de la cacher à cause d'une exception.
      return false;
    }
  });
  const [pending, startTransition] = useTransition();

  if (hidden) return null;

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await saveFirstName(value);
      if (result.error) {
        setError(result.error);
        return;
      }
      setHidden(true);
    });
  }

  function dismiss() {
    try {
      localStorage.setItem(DISMISSED_KEY, "1");
    } catch {
      // Sans stockage, la carte reviendra au prochain chargement. Tant pis :
      // c'est moins grave que de faire échouer le clic.
    }
    setHidden(true);
  }

  return (
    <section className="flex flex-col gap-3 rounded-[var(--radius-card)] border border-border-soft bg-surface p-5 shadow-[var(--shadow-card)]">
      <div className="flex flex-col gap-1">
        <h2 className="text-sm font-semibold">Comment on t&apos;appelle ?</h2>
        <p className="text-xs leading-relaxed text-muted">
          Dis-le une fois, Vesti s&apos;en souvient.
        </p>
      </div>

      <form onSubmit={submit} className="flex flex-col gap-2">
        <Input
          autoComplete="given-name"
          autoCapitalize="words"
          maxLength={40}
          aria-label="Ton prénom"
          placeholder="Ton prénom"
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            setError(null);
          }}
        />

        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}

        <div className="flex gap-2">
          <Button type="submit" disabled={pending || value.trim().length === 0}>
            {pending ? "Enregistrement…" : "Enregistrer"}
          </Button>
          {/* `whitespace-nowrap` : sans lui, la place laissée par le bouton
              principal casse « Plus tard » sur deux lignes. */}
          <Button
            type="button"
            variant="ghost"
            block={false}
            onClick={dismiss}
            disabled={pending}
            className="flex-none whitespace-nowrap px-4"
          >
            Plus tard
          </Button>
        </div>
      </form>
    </section>
  );
}
