import Link from "next/link";
import { IconChevron } from "@/components/icons";
import { Avatar } from "@/components/ui";
import { formatDuration } from "@/lib/format";
import { formatCentsShort } from "@/lib/money";
import type { TeamRow } from "@/lib/queries";
import { ROLE_LABEL, type MemberTotals } from "@/lib/types";

/**
 * La carte d'un membre de l'équipe.
 *
 * Elle répond à trois questions dans l'ordre où on se les pose : où en est
 * cette personne (la barre), combien a-t-elle rapporté (le chiffre), et
 * est-elle dehors en ce moment (la diode qui bat).
 *
 * Elle sert à DEUX écrans — le tableau de score de l'accueil et la page
 * Équipe — et c'est délibéré : deux composants séparés finissent toujours
 * par diverger, et la même personne ne doit pas avoir l'air d'aller mieux
 * sur un écran que sur l'autre. La page Équipe passe en plus `totals`, qui
 * ajoute le cumul depuis le début.
 */
export function CarteJoueur({
  row,
  estAdmin,
  objectifParDefaut,
  rang,
  totals,
}: {
  row: TeamRow;
  estAdmin: boolean;
  objectifParDefaut: number;
  rang: number | null;
  /** Cumul depuis toujours. Absent sur l'accueil, présent sur /equipe. */
  totals?: MemberTotals;
}) {
  const { profile, day, cards } = row;
  // Quelqu'un qui n'a pas ouvert sa journée n'a pas d'objectif figé : on
  // affiche celui qui s'appliquera, plutôt qu'un tiret.
  const objectif = day?.goal_cards ?? profile.daily_goal_override ?? objectifParDefaut;
  const vendues = day?.cards_sold ?? 0;
  const progression = objectif > 0 ? Math.min(100, (vendues / objectif) * 100) : 0;
  const atteint = Boolean(day?.goal_reached);
  const enTournee = day?.status === "in_progress";
  // L'encadrement n'a pas d'objectif de vente. Lui afficher une barre à
  // « 0/10 » lui reprocherait de ne pas faire un travail qui n'est pas le
  // sien — sauf s'il a réellement ouvert une journée, auquel cas il vend
  // comme les autres et la barre a du sens.
  const suitUnObjectif = profile.role === "member" || Boolean(day);

  return (
    <Link href={`/equipe/${profile.id}`} className="carte-joueur block p-4">
      <div className="flex items-center gap-3.5">
        <span className={`rang ${rang ? `rang-${Math.min(rang, 3)}` : ""}`}>
          {rang ?? "–"}
        </span>

        <Avatar nom={profile.full_name} />

        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 truncate text-[15px]">
            {profile.full_name}
            <span
              className={`diode ${enTournee ? "diode-active" : atteint ? "diode-fini" : ""}`}
              aria-hidden="true"
            />
          </p>
          <p className="surtitre mt-0.5 truncate">
            {ROLE_LABEL[profile.role]}
            {cards ? ` · ${cards.held} en main` : ""}
          </p>
        </div>

        <div className="text-right">
          <p className="chiffre text-lg text-craie">
            {day ? formatCentsShort(day.revenue_cents) : "—"}
          </p>
          {estAdmin && day ? (
            <p className="surtitre mt-0.5">dont {formatCentsShort(day.commission_cents)}</p>
          ) : null}
        </div>

        <IconChevron className="h-4 w-4 shrink-0 text-faint" />
      </div>

      {suitUnObjectif ? (
        <div className="mt-4 space-y-2">
          <div className={`xp ${atteint ? "xp-pleine" : ""}`}>
            <div className="xp-remplie" style={{ width: `${Math.max(progression, 2)}%` }} />
          </div>
          <div className="flex items-baseline justify-between gap-3">
            <span className="surtitre">
              <span className="text-craie">{vendues}</span> / {objectif} cartes
            </span>
            <span className="surtitre truncate">
              {day
                ? enTournee
                  ? `en tournée · ${formatDuration(day.duration_seconds)}`
                  : `journée close · ${formatDuration(day.duration_seconds)}`
                : "pas commencé"}
            </span>
          </div>
        </div>
      ) : null}

      {/* Le cumul, seulement là où il est demandé. Sur l'accueil il
          brouillerait la lecture du jour, qui est la question du moment. */}
      {totals ? (
        <div className="mt-4 flex items-baseline justify-between gap-3 border-t border-trait pt-3">
          <span className="surtitre truncate">
            <span className="text-craie">{totals.cards_sold}</span> cartes depuis
            le début
          </span>
          <span className="surtitre shrink-0 text-craie">
            {formatCentsShort(totals.revenue_cents)}
          </span>
        </div>
      ) : null}
    </Link>
  );
}
