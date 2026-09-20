import Link from "next/link";
import { IconChevron } from "@/components/icons";
import { percentOf } from "@/lib/money";
import { DAY_STATUS_LABEL, type DisplayDayStatus } from "@/lib/types";

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
      <div className="min-w-0">
        {surtitre ? <p className="surtitre mb-2">{surtitre}</p> : null}
        <h1 className="titre text-4xl sm:text-5xl">{titre}</h1>
      </div>
      {children ? <div className="flex items-center gap-2">{children}</div> : null}
    </div>
  );
}

// Tuile de chiffre. `accent` réserve le lime au chiffre qui compte le plus de
// l'écran : s'ils s'allument tous, plus aucun ne ressort.
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
    <div
      className={`panneau overflow-hidden p-3.5 ${
        accent ? "border-l-2 border-l-lime" : ""
      } ${className}`}
    >
      <p className="surtitre-serre">{label}</p>
      <p
        className={`chiffre mt-2 text-2xl sm:text-3xl ${accent ? "text-lime" : ""}`}
      >
        {valeur}
      </p>
      {detail ? <p className="mt-1.5 text-xs text-faint">{detail}</p> : null}
    </div>
  );
}

// La jauge d'objectif : un cran par carte tant que ça reste lisible, une
// barre continue au-delà. Les crans au-delà de l'objectif passent en orange —
// le dépassement se voit, il ne disparaît pas dans une barre pleine.
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

const STATUT_CLASSE: Record<DisplayDayStatus, string> = {
  not_started: "tampon tampon-gris",
  in_progress: "tampon tampon-lime",
  goal_reached: "tampon tampon-lime",
  goal_missed: "tampon tampon-orange",
  validated: "tampon tampon-lime",
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
    <div className="panneau-plat px-5 py-9 text-center">
      <p className="titre text-xl text-dim">{titre}</p>
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

// Bandeau défilant des chiffres du jour. La piste est dupliquée à
// l'identique : elle translate de -50 %, donc la boucle se referme sans saut.
export function Bandeau({ items }: { items: string[] }) {
  if (items.length === 0) return null;
  const piste = [...items, ...items];

  return (
    <div className="marquee panneau-plat py-2" aria-hidden="true">
      <div className="marquee-piste">
        {piste.map((item, index) => (
          <span
            key={index}
            className="surtitre flex shrink-0 items-center gap-3 px-4 text-dim"
          >
            {item}
            <span className="inline-block h-1 w-1 bg-lime" />
          </span>
        ))}
      </div>
    </div>
  );
}

// Code-barres. Les barres sont tirées de la chaîne passée : même entrée,
// même dessin. Ce n'est pas un vrai EAN — c'est un ornement honnête, qui
// signe le ticket sans prétendre être scannable.
export function CodeBarres({
  valeur,
  className = "h-8",
}: {
  valeur: string;
  className?: string;
}) {
  let graine = 0;
  for (let i = 0; i < valeur.length; i += 1) {
    graine = (graine * 31 + valeur.charCodeAt(i)) >>> 0;
  }

  const barres: number[] = [];
  for (let i = 0; i < 44; i += 1) {
    graine = (graine * 1103515245 + 12345) >>> 0;
    barres.push(1 + ((graine >>> 16) % 3));
  }

  return (
    <div
      className={`flex items-end gap-[2px] ${className}`}
      aria-hidden="true"
      title={valeur}
    >
      {barres.map((largeur, index) => (
        <span
          key={index}
          className="h-full bg-os"
          style={{
            width: `${largeur}px`,
            opacity: index % 2 === 0 ? 0.75 : 0.25,
          }}
        />
      ))}
    </div>
  );
}

// Avatar : la photo si elle existe, les initiales sinon. Carré à coins
// légèrement cassés — la DA n'a plus de cercles.
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
    sm: "h-8 w-8 text-[10px]",
    md: "h-10 w-10 text-xs",
    lg: "h-16 w-16 text-lg",
  }[taille];

  const lettres = nom
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  if (url) {
    return (
      /* eslint-disable-next-line @next/next/no-img-element -- le bucket des
         avatars est public et déjà dimensionné ; passer par l'optimiseur
         ajouterait un aller-retour pour une vignette de 40 px. */
      <img
        src={url}
        alt={nom}
        className={`shrink-0 rounded-[4px] border border-trait object-cover ${classes}`}
      />
    );
  }

  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-[4px] border border-trait bg-ardoise-3 font-mono font-bold tracking-wide ${classes}`}
    >
      {lettres}
    </span>
  );
}
