import type { Metadata } from "next";
import Link from "next/link";
import { Compteur } from "@/components/compteur";
import { EnTete, StatutJournee, Vide } from "@/components/ui";
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
    <div className="space-y-6">
      <EnTete
        surtitre={staff ? "Journées de l'équipe" : "Mes journées"}
        titre="Historique"
      />

      <section className="cascade grid grid-cols-3 gap-5">
        <div className="min-w-0">
          <p className="surtitre-serre">Journées</p>
          <p className="chiffre mt-1 text-[clamp(1.5rem,7vw,2.25rem)] text-craie">
            <Compteur valeur={days.length} />
          </p>
          <p className="mt-1 text-sm text-faint">enregistrées</p>
        </div>
        <div className="min-w-0">
          <p className="surtitre-serre">Chiffre d&apos;affaires</p>
          <p className="chiffre mt-1 text-[clamp(1.5rem,7vw,2.25rem)] text-craie">
            <Compteur valeur={caTotal} format="montant" />
          </p>
          <p className="mt-1 text-sm text-faint">cumulé</p>
        </div>
        <div className="min-w-0">
          <p className="surtitre-serre">{staff ? "Objectifs" : "Mon net"}</p>
          <p className="chiffre mt-1 text-[clamp(1.5rem,7vw,2.25rem)] text-peche">
            {staff ? (
              <>
                <Compteur valeur={atteints} />
                <span className="text-faint">/{days.length}</span>
              </>
            ) : (
              <Compteur valeur={netTotal} format="montant" />
            )}
          </p>
          <p className="mt-1 text-sm text-faint">
            {staff ? "atteints" : "cumulé"}
          </p>
        </div>
      </section>

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
        <ul className="cascade space-y-3 pb-4">
          {days.map((day) => (
            <li key={day.id} className="carte-joueur p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[15px] capitalize">
                    {formatDateLong(day.work_date)}
                  </p>
                  <p className="surtitre mt-0.5 truncate">
                    {staff ? `${noms.get(day.member_id) ?? "—"} · ` : ""}
                    {formatDuration(day.duration_seconds)} · {day.sale_count} vente
                    {day.sale_count > 1 ? "s" : ""}
                  </p>
                </div>
                <StatutJournee statut={displayDayStatus(day)} />
              </div>

              <div className="mt-4 space-y-2">
                <div className={`xp ${day.goal_reached ? "xp-pleine" : ""}`}>
                  <div
                    className="xp-remplie"
                    style={{
                      width: `${Math.max(
                        day.goal_cards > 0
                          ? Math.min(100, (day.cards_sold / day.goal_cards) * 100)
                          : 0,
                        2,
                      )}%`,
                    }}
                  />
                </div>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="surtitre">
                    <span className="text-craie">{day.cards_sold}</span> /{" "}
                    {day.goal_cards} cartes
                  </span>
                  <span className="surtitre">
                    CA {formatCentsShort(day.revenue_cents)} · net{" "}
                    <span className="text-craie">
                      {formatCentsShort(day.net_after_penalty_cents)}
                    </span>
                  </span>
                </div>
              </div>

              {day.penalty_cents > 0 ? (
                <p className="mt-3 text-sm text-peche">
                  Retenue validée par l&apos;encadrement :{" "}
                  {formatCents(day.penalty_cents)}
                </p>
              ) : null}

              {day.notes ? (
                <p className="texte-libre mt-3 text-sm whitespace-pre-wrap text-faint">
                  {day.notes}
                </p>
              ) : null}

              {staff ? (
                <Link
                  href={`/equipe/${day.member_id}`}
                  className="surtitre mt-3 inline-block hover:text-craie"
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
