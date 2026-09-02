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
      className={`min-h-[54px] w-full rounded-2xl border border-border bg-surface px-4 text-foreground outline-none transition placeholder:text-muted/60 focus:border-accent focus:ring-4 focus:ring-accent/15 ${className}`}
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
      className={`min-h-[48px] rounded-full border px-4 text-sm font-semibold transition active:scale-[0.97] ${
        selected
          ? "border-accent bg-accent text-accent-foreground shadow-[var(--shadow-lift)]"
          : "border-border bg-surface text-foreground hover:border-accent/60"
      }`}
    >
      {children}
    </button>
  );
}

/**
 * Carte, la brique de mise en page de l'app. Centralisée ici pour que le rayon
 * et l'ombre ne divergent pas d'un écran à l'autre.
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
    surface: "border-border-soft bg-surface shadow-[var(--shadow-card)]",
    soft: "border-transparent bg-accent-soft",
    accent: "border-transparent bg-accent text-accent-foreground shadow-[var(--shadow-lift)]",
  } as const;

  return (
    <section
      className={`flex flex-col gap-3 rounded-[var(--radius-card)] border p-5 ${TONES[tone]} ${className}`}
    >
      {children}
    </section>
  );
}
