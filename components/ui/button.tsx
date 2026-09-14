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
  // Contour seul, sans aplat : dans une page sans carte, un fond blanc sur un
  // fond blanc ne dit rien. C'est le trait qui porte le bouton.
  secondary:
    "text-foreground border border-border hover:border-accent hover:text-accent-strong disabled:opacity-40",
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
      /*
        Angle droit, capitales, interlettrage ouvert : le bouton d'une enseigne
        de mode, pas d'une application. Trois détails qui font la différence et
        qu'on perd si on les touche isolément.

        `tracking-[0.1em]` + `uppercase` : sans ça, un bouton à angle droit lit
        simplement « bouton pas fini ». C'est l'espacement qui le rend
        délibéré.

        `text-[13px]` alors que le texte courant est à 15 : en capitales, 13
        occupe la hauteur d'un 15 en bas de casse. Le bouton ne crie plus.

        ⚠️ `active:scale` a disparu. Il déplaçait les bords du bouton à chaque
        appui — un effet visible, et interdit par la règle « états de pression
        sans changement de gabarit ». Le retour se fait maintenant par la
        couleur, qui ne bouge rien.
      */
      className={buttonClasses(variant, block, className)}
    />
  );
}

/**
 * Le dessin du bouton, en UN seul endroit.
 *
 * ⚠️ Cette fonction et le composant `Button` portaient chacun leur propre copie
 * de la chaîne de classes, sous un commentaire qui affirmait « même dessin ».
 * Ça a tenu jusqu'à la première modification : le composant est passé en
 * capitales à angle droit, la fonction est restée en gélule bas de casse, et
 * la page d'accueil — qui utilise la fonction — a gardé l'ancien bouton. Le
 * défaut n'était visible qu'à l'écran, pas dans le diff.
 *
 * Deux copies d'une décision de design divergent toujours. Il n'y en a plus
 * qu'une, et `Button` l'appelle comme tout le monde.
 */
export const buttonClasses = (
  variant: Variant = "primary",
  block = true,
  className = ""
) =>
  `inline-flex min-h-[52px] items-center justify-center gap-2 px-6 text-[13px] font-semibold uppercase tracking-[0.1em] transition-colors duration-150 disabled:cursor-not-allowed ${
    VARIANTS[variant]
  } ${block ? "w-full" : ""} ${className}`;
