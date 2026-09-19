import Link from "next/link";
import { IconChevron } from "@/components/icons";
import { percentOf } from "@/lib/money";
import {
  DAY_STATUS_LABEL,
  type DisplayDayStatus,
} from "@/lib/types";

// Briques d'interface partagées. Elles portent le style du projet pour que
// les pages n'aient pas à le réinventer — et pour qu'un changement de
// direction artistique se fasse ici, pas dans quinze fichiers.

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
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        {surtitre ? <p className="surtitre mb-2">{surtitre}</p> : null}
        <h1 className="titre text-3xl sm:text-4xl">{titre}</h1>
      </div>
      {children ? <div className="flex items-center gap-2">{children}</div> : null}
    </div>
  );
}

// Tuile de chiffre. `accent` réserve le dégradé violet→magenta au chiffre qui
// compte le plus de l'écran : s'ils s'allument tous, plus aucun ne ressort.
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
    <div className={`panneau relative overflow-hidden p-4 ${className}`}>
      {accent ? (
        <span
          className="absolute inset-x-0 top-0 h-px"
          style={{
            background:
              "linear-gradient(90deg, transparent, rgba(139,92,246,0.9), rgba(255,45,134,0.9), transparent)",
          }}
          aria-hidden="true"
        />
      ) : null}
      <p className="surtitre whitespace-nowrap">{label}</p>
      <p
        className={`chiffre mt-2 text-2xl sm:text-3xl ${
          accent
            ? "bg-gradient-to-br from-[#c4b5fd] via-[#e9d5ff] to-[#ff8ec0] bg-clip-text text-transparent"
            : ""
        }`}
      >
        {valeur}
      </p>
      {detail ? <p className="mt-1.5 text-xs text-faint">{detail}</p> : null}
    </div>
  );
}

// La jauge d'objectif : un segment par carte tant que ça reste lisible
// (jusqu'à 30), une barre continue au-delà.
export function Jauge({
  valeur,
  objectif,
}: {
  valeur: number;
  objectif: number;
}) {
  const atteint = valeur >= objectif;

  if (objectif > 30) {
    const pct = Math.min(100, percentOf(valeur, objectif));
    return (
      <div className="barre">
        <div className="barre-remplie" style={{ width: `${pct}%` }} />
      </div>
    );
  }

  return (
    <div
      className="jauge"
      role="progressbar"
      aria-valuenow={valeur}
      aria-valuemin={0}
      aria-valuemax={objectif}
      aria-label={`${valeur} sur ${objectif} cartes`}
    >
      {Array.from({ length: objectif }, (_, index) => (
        <span
          key={index}
          className={`jauge-segment ${
            index < valeur
              ? atteint
                ? "jauge-segment-fini"
                : "jauge-segment-plein"
              : ""
          }`}
        />
      ))}
    </div>
  );
}

const STATUT_CLASSE: Record<DisplayDayStatus, string> = {
  not_started: "pastille",
  in_progress: "pastille pastille-vive",
  goal_reached: "pastille pastille-succes",
  goal_missed: "pastille pastille-alerte",
  validated: "pastille pastille-succes",
};

export function StatutJournee({ statut }: { statut: DisplayDayStatus }) {
  return (
    <span className={STATUT_CLASSE[statut]}>
      {statut === "in_progress" ? <span className="point-live" /> : null}
      {DAY_STATUS_LABEL[statut]}
    </span>
  );
}

export function Vide({
  titre,
  children,
}: {
  titre: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="panneau-plat px-5 py-10 text-center">
      <p className="titre text-lg text-dim">{titre}</p>
      {children ? (
        <div className="mt-2 text-sm text-faint">{children}</div>
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
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="surtitre">{titre}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

// Ligne de liste cliquable. Le chevron indique qu'il y a quelque chose
// derrière — sinon, ne pas utiliser ce composant.
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
      className="panneau flex items-center gap-3 p-3.5 transition-transform active:scale-[0.99]"
    >
      <div className="min-w-0 flex-1">{children}</div>
      <IconChevron className="h-4 w-4 shrink-0 text-faint" />
    </Link>
  );
}

// Bandeau défilant des chiffres du jour. Le contenu est dupliqué à
// l'identique : la piste translate de -50 %, donc la boucle se referme sans
// saut visible. Purement CSS, rendu sur le serveur.
export function Bandeau({ items }: { items: string[] }) {
  if (items.length === 0) return null;

  const piste = [...items, ...items];

  return (
    <div className="marquee panneau-plat py-2.5" aria-hidden="true">
      <div className="marquee-piste">
        {piste.map((item, index) => (
          <span
            key={index}
            className="surtitre flex shrink-0 items-center gap-3 px-4 text-dim"
          >
            {item}
            <span className="inline-block h-1 w-1 rounded-full bg-[var(--magenta)]" />
          </span>
        ))}
      </div>
    </div>
  );
}

export function Avatar({
  nom,
  taille = "md",
}: {
  nom: string;
  taille?: "sm" | "md" | "lg";
}) {
  const classes = {
    sm: "h-8 w-8 text-[11px]",
    md: "h-10 w-10 text-xs",
    lg: "h-14 w-14 text-base",
  }[taille];

  const lettres = nom
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full border border-line bg-surface-2 font-bold tracking-wide ${classes}`}
    >
      {lettres}
    </span>
  );
}
