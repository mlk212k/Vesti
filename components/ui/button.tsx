import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";

/**
 * Boutons en gélule : le logo n'est fait que de cercles et de traits à bouts
 * ronds, la forme des boutons le prolonge.
 *
 * Un seul aplat violet par écran. `secondary` et `ghost` existent pour que
 * l'action principale reste la seule tache saturée — c'est la règle qui empêche
 * l'interface de virer au violet uniforme.
 */
const VARIANTS: Record<Variant, string> = {
  // Désactivé : on retire la couleur au lieu de la diluer. Un violet à 40 %
  // d'opacité reste un bouton violet, et se clique.
  primary:
    "bg-accent text-accent-foreground shadow-[var(--shadow-lift)] hover:bg-accent-strong disabled:bg-surface-sunken disabled:text-muted disabled:shadow-none",
  secondary:
    "bg-surface text-foreground border border-border hover:border-accent hover:text-accent-strong disabled:opacity-40",
  ghost: "text-muted hover:bg-accent-soft hover:text-accent-strong disabled:opacity-40",
  // Jeton dédié plutôt que `text-white` : en mode sombre le rouge s'éclaircit
  // pour se détacher du fond, et un blanc figé dessus tomberait sous le seuil
  // de lisibilité.
  danger:
    "bg-danger text-danger-foreground hover:brightness-95 disabled:opacity-40",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  /** Pleine largeur : le défaut sur mobile, où tous les CTA prennent la largeur. */
  block?: boolean;
}

export function Button({
  variant = "primary",
  block = true,
  className = "",
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      className={`inline-flex min-h-[54px] items-center justify-center gap-2 rounded-full px-6 text-[15px] font-semibold tracking-[-0.01em] transition duration-150 active:scale-[0.98] disabled:cursor-not-allowed disabled:active:scale-100 ${
        VARIANTS[variant]
      } ${block ? "w-full" : ""} ${className}`}
    />
  );
}

/** Même dessin que `Button`, pour les liens qui agissent comme des boutons. */
export const buttonClasses = (variant: Variant = "primary", block = true) =>
  `inline-flex min-h-[54px] items-center justify-center gap-2 rounded-full px-6 text-[15px] font-semibold tracking-[-0.01em] transition duration-150 active:scale-[0.98] ${
    VARIANTS[variant]
  } ${block ? "w-full" : ""}`;
