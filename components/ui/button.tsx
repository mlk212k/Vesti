import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";

/**
 * ⚠️ Ces boutons étaient des gélules (`rounded-full`) pleine largeur de 54 px de
 * haut, avec une ombre violette portée. Trois traits qui, ensemble, forment la
 * signature graphique la plus reconnaissable des interfaces générées — et le
 * premier reproche fait à cet écran.
 *
 * Ce qu'ils sont devenus, et pourquoi :
 *  - rayon `control` (10 px) au lieu de la gélule. La gélule reste réservée aux
 *    vraies pastilles : puces, étiquettes, avatars.
 *  - 50 px de haut au lieu de 54. Toujours au-dessus des 44 px recommandés par
 *    Apple pour une cible tactile, mais sans la masse d'une bannière.
 *  - plus d'ombre portée sur l'aplat violet. Une ombre colorée sous un bouton
 *    plein est un effet, pas une information : le violet suffit à dire « c'est
 *    ici qu'on appuie ».
 *
 * Ce qui n'a PAS changé : un seul aplat violet par écran. `secondary` et
 * `ghost` existent pour que l'action principale reste la seule tache saturée.
 */
const VARIANTS: Record<Variant, string> = {
  // Désactivé : on retire la couleur au lieu de la diluer. Un violet à 40 %
  // d'opacité reste un bouton violet, et se clique.
  primary:
    "bg-accent text-accent-foreground hover:bg-accent-strong disabled:bg-surface-sunken disabled:text-muted",
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
      className={`inline-flex min-h-[50px] items-center justify-center gap-2 rounded-[var(--radius-control)] px-5 text-[15px] font-semibold tracking-[-0.01em] transition duration-150 active:scale-[0.99] disabled:cursor-not-allowed disabled:active:scale-100 ${
        VARIANTS[variant]
      } ${block ? "w-full" : ""} ${className}`}
    />
  );
}

/** Même dessin que `Button`, pour les liens qui agissent comme des boutons. */
export const buttonClasses = (variant: Variant = "primary", block = true) =>
  `inline-flex min-h-[50px] items-center justify-center gap-2 rounded-[var(--radius-control)] px-5 text-[15px] font-semibold tracking-[-0.01em] transition duration-150 active:scale-[0.99] ${
    VARIANTS[variant]
  } ${block ? "w-full" : ""}`;
