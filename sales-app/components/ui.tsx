import Link from "next/link";
import { IconChevron } from "@/components/icons";
import { percentOf } from "@/lib/money";
import { DAY_STATUS_LABEL, type DisplayDayStatus } from "@/lib/types";

// Briques d'interface partagées. Elles portent le style du projet pour que
// les pages n'aient pas à le réinventer — et pour qu'un changement de
// direction artistique se fasse ici, pas dans quinze fichiers.
//
// Règle de cette DA, valable pour tout ce fichier : DOUX PARTOUT. Des
// rayons larges, du verre dépoli, des étiquettes écrites comme des phrases —
// jamais de capitales espacées, jamais de texte sous 13 px, jamais de
// monospace. Si un élément ressemble à un écran de cotes, il est raté.

export function EnTete({
  surtitre,
  titre,
  children,
}: {
  surtitre?: string;
  titre: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {surtitre ? <p className="surtitre mb-3">{surtitre}</p> : null}
        <h1 className="titre text-[clamp(2.2rem,10vw,3.4rem)]">{titre}</h1>
      </div>
      {children ? <div className="flex items-center gap-2">{children}</div> : null}
    </div>
  );
}

/**
 * Le mot-matière : un mot énorme posé DERRIÈRE le reste, qui déborde de
 * l'écran et qu'on ne lit pas vraiment. Il donne l'échelle et le ton.
 *
 * Il n'y en a jamais deux sur le même écran, et il est toujours
 * `aria-hidden` : c'est de la matière, pas de l'information. Ce qu'il dit
 * est toujours écrit ailleurs, en lisible.
 */
export function Mot({
  children,
  plein = false,
  className = "",
}: {
  children: React.ReactNode;
  plein?: boolean;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={`mot ${plein ? "mot-plein" : ""} ${className}`}
    >
      {children}
    </span>
  );
}

/**
 * Un chiffre et son libellé. Pas de tuile, pas de bordure : la hiérarchie
 * est entièrement typographique.
 *
 * `accent` réserve la pêche au seul chiffre qui compte sur l'écran. S'ils
 * s'allument tous, plus aucun ne ressort.
 */
export function Stat({
  label,
  valeur,
  detail,
  accent = false,
  className = "",
}: {
  label: string;
  valeur: React.ReactNode;
  detail?: React.ReactNode;
  accent?: boolean;
  className?: string;
}) {
  return (
    <div className={`min-w-0 ${className}`}>
      <p className="surtitre-serre">{label}</p>
      <p
        className={`chiffre mt-1 text-[clamp(1.5rem,7vw,2.25rem)] ${
          accent ? "text-accent" : "metal"
        }`}
      >
        {valeur}
      </p>
      {detail ? <p className="mt-1 text-sm text-faint">{detail}</p> : null}
    </div>
  );
}

// Jauge secondaire, pour les listes où il n'y a pas la place d'un objet.
// Sur l'écran d'accueil, la jauge est la tranche de la dalle — pas ceci.
export function Jauge({
  valeur,
  objectif,
}: {
  valeur: number;
  objectif: number;
}) {
  if (objectif > 24) {
    const pct = Math.min(100, percentOf(valeur, objectif));
    return (
      <div className="barre">
        <div className="barre-remplie" style={{ width: `${pct}%` }} />
      </div>
    );
  }

  const depassement = Math.max(0, valeur - objectif);
  const crans = objectif + Math.min(depassement, 6);

  return (
    <div
      className="jauge"
      role="progressbar"
      aria-valuenow={valeur}
      aria-valuemin={0}
      aria-valuemax={objectif}
      aria-label={`${valeur} sur ${objectif} cartes`}
    >
      {Array.from({ length: crans }, (_, index) => (
        <span
          key={index}
          className={`jauge-cran ${
            index < valeur
              ? index >= objectif
                ? "jauge-cran-bonus"
                : "jauge-cran-plein"
              : ""
          }`}
        />
      ))}
    </div>
  );
}

// Le statut d'une journée.
//
// Le beige (`pastille-accent`) a trois sens et trois seulement : c'est ton
// argent, agis maintenant, quelque chose ne va pas. « Objectif atteint »
// n'est aucun des trois — c'était donc la même pastille que « des gens
// manquent à l'appel », ce qui fait dire au même signal une bonne et une
// mauvaise nouvelle.
//
// Un objectif atteint est vrai EN CE MOMENT : il passe donc en lilas, comme
// la barre d'XP qui vire déjà au violet quand elle se remplit. Ce qui le
// distingue d'« en tournée », c'est le point qui bat — la DA sépare par le
// mouvement, pas par une couleur de plus.
const STATUT_CLASSE: Record<DisplayDayStatus, string> = {
  not_started: "pastille",
  in_progress: "pastille pastille-vive",
  goal_reached: "pastille pastille-vive",
  goal_missed: "pastille",
  validated: "pastille",
};

export function StatutJournee({ statut }: { statut: DisplayDayStatus }) {
  return (
    <span className={STATUT_CLASSE[statut]}>
      {statut === "in_progress" ? <span className="point-live" /> : null}
      {DAY_STATUS_LABEL[statut]}
    </span>
  );
}

// Le vide assumé : pas de panneau gris avec un texte au milieu, juste du
// noir et deux lignes.
export function Vide({
  titre,
  children,
}: {
  titre: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="px-2 py-14 text-center">
      <p className="titre text-2xl text-faint">{titre}</p>
      {children ? (
        <div className="mx-auto mt-3 max-w-xs text-sm text-faint">{children}</div>
      ) : null}
    </div>
  );
}

export function Section({
  titre,
  action,
  children,
}: {
  titre: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="surtitre">{titre}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

// Une ligne cliquable : un filet très sourd en bas, et le chevron qui
// avance sous le doigt.
export function LigneLien({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-4 border-b border-trait py-4 transition-transform duration-300 active:scale-[0.985]"
    >
      <div className="min-w-0 flex-1">{children}</div>
      <IconChevron className="h-4 w-4 shrink-0 text-faint transition-transform duration-500 group-hover:translate-x-1 group-hover:text-craie" />
    </Link>
  );
}

// Avatar : la photo si elle existe, les initiales sinon. Rond, et posé sur
// un creux plutôt que cerné d'un trait.
export function Avatar({
  nom,
  url,
  taille = "md",
}: {
  nom: string;
  url?: string | null;
  taille?: "sm" | "md" | "lg";
}) {
  const classes = {
    sm: "h-8 w-8 text-sm",
    md: "h-11 w-11 text-sm",
    lg: "h-20 w-20 text-xl",
  }[taille];

  const lettres = nom
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  // L'anneau holographique vit sur un CONTENEUR, pas sur l'image : un
  // `<img>` n'a pas de pseudo-élément, donc pas de `::after` pour porter le
  // masque en anneau. Le conteneur porte aussi le `shrink-0`, sans quoi il
  // s'écraserait dans une ligne flex serrée en laissant l'anneau de travers.
  if (url) {
    return (
      <span className={`avatar ${classes}`}>
        {/* eslint-disable-next-line @next/next/no-img-element -- le bucket
            des avatars est public et déjà dimensionné ; passer par
            l'optimiseur ajouterait un aller-retour pour une vignette de
            44 px. */}
        <img
          src={url}
          alt={nom}
          className="h-full w-full rounded-full object-cover"
        />
      </span>
    );
  }

  return (
    <span
      className={`avatar items-center justify-center rounded-full bg-velours text-dim ${classes}`}
    >
      {lettres}
    </span>
  );
}
