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
      {/* Micro-libellé capitales : même registre que les titres de section, pour
          qu'un formulaire ne soit pas un îlot typographique dans la page. */}
      <span className="label text-muted">{label}</span>
      {children}
      {hint && <span className="text-xs leading-relaxed text-muted">{hint}</span>}
    </label>
  );
}

export function Input({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      /*
        Un trait bas, pas une boîte.

        Le champ encadré posait un rectangle blanc sur un fond presque blanc :
        invisible sans sa bordure, et c'est justement cette bordure qui était
        à 1,62:1. Le trait bas règle les deux — il porte tout le contraste
        (3,80:1) sur une seule ligne, et il donne la forme qu'ont les
        formulaires de prêt-à-porter.

        ⚠️ `border-b-2` au focus, pas un anneau : un anneau de 4 px autour d'un
        champ sans boîte flotterait dans le vide. L'épaississement du trait
        suffit, et `:focus-visible` global garde l'anneau pour le clavier.
      */
      className={`min-h-[52px] w-full border-b border-border bg-transparent px-0 text-foreground outline-none transition-colors placeholder:text-muted/60 focus:border-b-2 focus:border-accent ${className}`}
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
