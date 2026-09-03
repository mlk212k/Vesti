import type { InputHTMLAttributes, ReactNode } from "react";

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-[13px] font-semibold tracking-[-0.01em] text-foreground">
        {label}
      </span>
      {children}
      {hint && <span className="text-xs leading-relaxed text-muted">{hint}</span>}
    </label>
  );
}

export function Input({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`min-h-[52px] w-full rounded-[var(--radius-control)] border border-border bg-surface px-4 text-foreground outline-none transition placeholder:text-muted/60 focus:border-accent focus:ring-4 focus:ring-accent/15 ${className}`}
    />
  );
}

/** Bouton de choix unique, dimensionné pour le pouce. */
export function ChoiceChip({
  selected,
  children,
  onClick,
}: {
  selected: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`min-h-[46px] rounded-full border px-4 text-sm font-semibold transition active:scale-[0.98] ${
        selected
          ? "border-accent bg-accent text-accent-foreground"
          : "border-border bg-surface text-foreground hover:border-accent/60"
      }`}
    >
      {children}
    </button>
  );
}

/**
 * Carte : un panneau qui contient un objet distinct de la page.
 *
 * ⚠️ « Distinct » est le mot qui compte. Une carte porte une bordure et un fond,
 * et ces deux traits disent « ceci est un objet à part ». Quand chaque section
 * d'un écran en reçoit, ils ne disent plus rien : tout est au même niveau, et
 * la hiérarchie que la carte prétendait créer disparaît. C'est ce qui donnait à
 * l'app son air d'empilement de dalles.
 *
 * La règle : une carte pour ce qui se manipule ou se lit comme une unité — un
 * abonnement, un verdict, un formulaire. Pour simplement GROUPER, on se sert de
 * l'espace et d'un titre de section, qui ne coûtent aucun trait.
 *
 * Le rayon et le fond sont centralisés ici pour qu'ils ne divergent pas d'un
 * écran à l'autre — c'est arrivé, six rayons différents cohabitaient.
 */
export function Card({
  children,
  className = "",
  tone = "surface",
}: {
  children: ReactNode;
  className?: string;
  tone?: "surface" | "soft" | "accent";
}) {
  const TONES = {
    surface: "border-border-soft bg-surface",
    soft: "border-transparent bg-accent-soft",
    accent: "border-transparent bg-accent text-accent-foreground",
  } as const;

  return (
    <section
      className={`flex flex-col gap-3 rounded-[var(--radius-card)] border p-4 ${TONES[tone]} ${className}`}
    >
      {children}
    </section>
  );
}
