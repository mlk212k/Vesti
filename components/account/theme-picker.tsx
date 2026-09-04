"use client";

import { useSyncExternalStore } from "react";
import {
  THEME_CHOICES,
  applyTheme,
  readTheme,
  type ThemeChoice,
} from "@/lib/theme";

/**
 * Le choix vit dans `localStorage`, c'est-à-dire hors de React. On le lit donc
 * comme une source extérieure plutôt que de le recopier dans un état au montage :
 * écrire un état depuis un effet déclenche un second rendu en cascade, ce que
 * l'app interdit ailleurs pour la même raison.
 */
let listeners: (() => void)[] = [];

function subscribe(listener: () => void) {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter((entry) => entry !== listener);
  };
}

/** Le serveur n'a pas accès au stockage : il rend le cas par défaut. */
const serverSnapshot = (): ThemeChoice => "system";

/**
 * Choix du thème, dans les réglages.
 *
 * Le mode sombre existait déjà mais suivait le téléphone en silence : personne
 * ne pouvait savoir qu'il était là, ni le forcer. Trois choix explicites valent
 * mieux qu'un interrupteur à deux positions — « Système » n'est pas la même
 * chose que « Clair », et sans lui on ne peut plus revenir au comportement par
 * défaut une fois qu'on y a touché.
 */
export function ThemePicker() {
  const choice = useSyncExternalStore(subscribe, readTheme, serverSnapshot);

  function select(value: ThemeChoice) {
    applyTheme(value);
    for (const listener of listeners) listener();
  }

  // ⚠️ Ce composant ne porte NI cadre, NI titre : il n'est que le sélecteur.
  // Il possédait les deux, et se retrouvait imbriqué dans le groupe
  // « Apparence » des réglages — qui affichait donc le mot deux fois, dans deux
  // cadres emboîtés. Un composant qui décide de son propre entourage ne peut
  // être posé nulle part ailleurs sans se répéter.
  return (
    <div
      role="radiogroup"
      aria-label="Thème de l'application"
      className="flex gap-2"
    >
      {THEME_CHOICES.map((option) => {
        const active = choice === option.value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => select(option.value)}
            style={{ touchAction: "manipulation" }}
            className={`flex min-h-[44px] flex-1 items-center justify-center rounded-[var(--radius-control)] px-3 text-xs font-semibold transition ${
              active
                ? "bg-accent text-accent-foreground"
                : "border border-border-soft text-muted hover:border-accent hover:text-accent-strong"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
