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

  return (
    <section className="flex flex-col gap-3 rounded-[var(--radius-card)] border border-border-soft bg-surface p-5">
      <div className="flex flex-col gap-1">
        <h2 className="text-sm font-semibold">Apparence</h2>
        <p className="text-xs leading-relaxed text-muted">
          « Système » suit le réglage de ton téléphone.
        </p>
      </div>

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
              className={`flex flex-1 items-center justify-center rounded-full px-3 py-2.5 text-xs font-semibold transition ${
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
    </section>
  );
}
