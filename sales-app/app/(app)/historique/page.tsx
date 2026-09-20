import type { Metadata } from "next";
import Link from "next/link";
import { EnTete, Jauge, Stat, StatutJournee, Vide } from "@/components/ui";
import { isStaff, requireUser } from "@/lib/auth";
import { formatDateLong, formatDuration } from "@/lib/format";
import { formatCents, formatCentsShort } from "@/lib/money";
import { listDays, listProfiles } from "@/lib/queries";
import { displayDayStatus } from "@/lib/types";

export const metadata: Metadata = { title: "Historique" };

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ membre?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const staff = isStaff(user.role);

  const [days, profiles] = await Promise.all([
    listDays({ memberId: staff ? params.membre : user.id, limit: 90 }),
    staff ? listProfiles({ activeOnly: true }) : Promise.resolve([]),
  ]);

  const noms = new Map(profiles.map((p) => [p.id, p.full_name]));
  const caTotal = days.reduce((sum, day) => sum + day.revenue_cents, 0);
  const netTotal = days.reduce((sum, day) => sum + day.net_after_penalty_cents, 0);
  const atteints = days.filter((day) => day.goal_reached).length;

  return (
    <div className="montee space-y-6">
      <EnTete
        surtitre={staff ? "Journées de l'équipe" : "Mes journées"}
        titre="Historique"
      />

      <div className="grid grid-cols-3 gap-3">
        <Stat label="Journées" valeur={days.length} />
        <Stat label="CA cumulé" valeur={formatCentsShort(caTotal)} accent />
        <Stat
          label={staff ? "Objectifs" : "Mon net"}
          valeur={staff ? `${atteints}/${days.length}` : formatCentsShort(netTotal)}
        />
      </div>

      {staff ? (
        <form method="get" className="flex gap-2">
          <select name="membre" defaultValue={params.membre ?? ""} className="champ">
            <option value="">Toute l&apos;équipe</option>
            {profiles.map((profile) => (
              <option key={profile.id} value={profile.id}>
                {profile.full_name}
              </option>
            ))}
          </select>
          <button type="submit" className="btn shrink-0">
            Filtrer
          </button>
        </form>
      ) : null}

      {days.length === 0 ? (
        <Vide titre="Aucune journée enregistrée">
          Les journées apparaissent ici dès la première ouverture.
        </Vide>
      ) : (
        <ul className="space-y-2">
          {days.map((day) => (
            <li key={day.id} className="panneau p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium capitalize">
                    {formatDateLong(day.work_date)}
                  </p>
                  <p className="text-xs text-faint">
                    {staff ? `${noms.get(day.member_id) ?? "—"} · ` : ""}
                    {formatDuration(day.duration_seconds)} ·{" "}
                    {day.sale_count} vente{day.sale_count > 1 ? "s" : ""}
                  </p>
                </div>
                <StatutJournee statut={displayDayStatus(day)} />
              </div>

              <div className="mt-3 flex items-center gap-3">
                <span className="chiffre w-14 shrink-0 text-sm text-dim">
                  {day.cards_sold} / {day.goal_cards}
                </span>
                <div className="flex-1">
                  <Jauge valeur={day.cards_sold} objectif={day.goal_cards} />
                </div>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <div className="panneau-creux py-2">
                  <p className="surtitre">CA</p>
                  <p className="chiffre mt-0.5 text-sm">
                    {formatCentsShort(day.revenue_cents)}
                  </p>
                </div>
                <div className="panneau-creux py-2">
                  <p className="surtitre">Commission</p>
                  <p className="chiffre mt-0.5 text-sm text-faint">
                    {formatCentsShort(day.commission_cents)}
                  </p>
                </div>
                <div className="panneau-creux py-2">
                  <p className="surtitre">Net</p>
                  <p className="chiffre mt-0.5 text-sm">
                    {formatCentsShort(day.net_after_penalty_cents)}
                  </p>
                </div>
              </div>

              {day.penalty_cents > 0 ? (
                <p className="mt-2 text-xs text-orange">
                  Retenue validée par l&apos;encadrement :{" "}
                  {formatCents(day.penalty_cents)}
                </p>
              ) : null}

              {day.notes ? (
                <p className="texte-libre mt-2 text-xs whitespace-pre-wrap text-faint">
                  {day.notes}
                </p>
              ) : null}

              {staff ? (
                <Link
                  href={`/equipe/${day.member_id}`}
                  className="mt-2 inline-block text-xs text-faint hover:text-dim"
                >
                  Voir le profil →
                </Link>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
