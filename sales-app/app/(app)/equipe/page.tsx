import type { Metadata } from "next";
import Link from "next/link";
import { IconChevron } from "@/components/icons";
import { Avatar, EnTete, Jauge, Stat, StatutJournee, Vide } from "@/components/ui";
import { getSettings, isAdmin, requireRole } from "@/lib/auth";
import { formatDuration } from "@/lib/format";
import { formatCentsShort } from "@/lib/money";
import { getMemberTotals, getTeamToday } from "@/lib/queries";
import { displayDayStatus, ROLE_LABEL } from "@/lib/types";

export const metadata: Metadata = { title: "Équipe" };

// Vue de supervision : chaque ligne dit en une seconde où en est la personne.
// C'est l'écran de Malik ; l'admin a le même, plus les raccourcis de gestion.
export default async function TeamPage() {
  const viewer = await requireRole("admin", "manager");
  const [rows, totals, settings] = await Promise.all([
    getTeamToday(),
    getMemberTotals(),
    getSettings(),
  ]);

  const parMembre = new Map(totals.map((t) => [t.member_id, t]));
  const classement = [...rows].sort(
    (a, b) => (b.day?.cards_sold ?? 0) - (a.day?.cards_sold ?? 0),
  );

  return (
    <div className="montee space-y-6">
      <EnTete surtitre={settings.team_name} titre="Équipe">
        {isAdmin(viewer.role) ? (
          <Link href="/membres" className="btn btn-fantome">
            Gérer les comptes
          </Link>
        ) : null}
      </EnTete>

      {classement.length === 0 ? (
        <Vide titre="Aucun membre actif" />
      ) : (
        <ul className="space-y-3">
          {classement.map(({ profile, day, cards }) => {
            const total = parMembre.get(profile.id);
            const objectif =
              day?.goal_cards ??
              profile.daily_goal_override ??
              settings.default_daily_goal;

            return (
              <li key={profile.id}>
                <Link
                  href={`/equipe/${profile.id}`}
                  className="panneau block p-4 transition-transform active:scale-[0.99]"
                >
                  <div className="flex items-center gap-3">
                    <Avatar nom={profile.full_name} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{profile.full_name}</p>
                      <p className="text-xs text-faint">
                        {ROLE_LABEL[profile.role]} · {cards?.held ?? 0} en main
                      </p>
                    </div>
                    <StatutJournee statut={displayDayStatus(day)} />
                    <IconChevron className="h-4 w-4 shrink-0 text-faint" />
                  </div>

                  <div className="mt-3 flex items-center gap-3">
                    <span className="chiffre w-14 shrink-0 text-lg">
                      {day?.cards_sold ?? 0}
                      <span className="text-sm text-faint"> / {objectif}</span>
                    </span>
                    <div className="flex-1">
                      <Jauge valeur={day?.cards_sold ?? 0} objectif={objectif} />
                    </div>
                    <span className="w-14 shrink-0 text-right text-[11px] text-faint">
                      {day ? formatDuration(day.duration_seconds) : "—"}
                    </span>
                  </div>

                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <Stat
                      label="CA du jour"
                      valeur={formatCentsShort(day?.revenue_cents ?? 0)}
                      accent
                    />
                    <Stat
                      label="CA total"
                      valeur={formatCentsShort(total?.revenue_cents ?? 0)}
                    />
                    <Stat
                      label="Commission"
                      valeur={formatCentsShort(total?.commission_cents ?? 0)}
                    />
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
