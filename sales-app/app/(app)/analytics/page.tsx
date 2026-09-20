import type { Metadata } from "next";
import { Classement, Histogramme, type PointSerie } from "@/components/graphiques";
import { EnTete, Section, Stat } from "@/components/ui";
import { getSettings, isAdmin, requireRole } from "@/lib/auth";
import { formatDuration } from "@/lib/format";
import { formatCentsShort, formatRate } from "@/lib/money";
import {
  estPeriodeId,
  joursEntre,
  PERIODE_LABEL,
  resoudrePeriode,
  type PeriodeId,
} from "@/lib/periodes";
import { getPeriodTotals, listDays, listProfiles } from "@/lib/queries";

export const metadata: Metadata = { title: "Analytics" };

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{
    periode?: string;
    debut?: string;
    fin?: string;
    membre?: string;
  }>;
}) {
  const viewer = await requireRole("admin", "manager");
  const params = await searchParams;

  const periode: PeriodeId = estPeriodeId(params.periode)
    ? params.periode
    : "mois";
  const { from, to } = resoudrePeriode(periode, params.debut, params.fin);
  const membreId = params.membre || undefined;

  const [totaux, jours, profiles, settings] = await Promise.all([
    getPeriodTotals({ from, to, memberId: membreId }),
    listDays({ from, to, memberId: membreId, limit: 400 }),
    listProfiles({ activeOnly: true }),
    getSettings(),
  ]);

  // Série jour par jour, trous compris.
  const parJour = new Map<string, number>();
  const cartesParJour = new Map<string, number>();
  for (const jour of jours) {
    parJour.set(jour.work_date, (parJour.get(jour.work_date) ?? 0) + jour.revenue_cents);
    cartesParJour.set(
      jour.work_date,
      (cartesParJour.get(jour.work_date) ?? 0) + jour.cards_sold,
    );
  }

  const serieCA: PointSerie[] = joursEntre(from, to).map((jour) => ({
    label: jour.slice(8, 10) + "/" + jour.slice(5, 7),
    valeur: parJour.get(jour) ?? 0,
  }));

  const serieCartes: PointSerie[] = joursEntre(from, to).map((jour) => ({
    label: jour.slice(8, 10) + "/" + jour.slice(5, 7),
    valeur: cartesParJour.get(jour) ?? 0,
  }));

  // Classement par membre sur la période.
  const noms = new Map(profiles.map((p) => [p.id, p.full_name]));
  const parMembre = new Map<string, { ca: number; cartes: number }>();
  for (const jour of jours) {
    const courant = parMembre.get(jour.member_id) ?? { ca: 0, cartes: 0 };
    courant.ca += jour.revenue_cents;
    courant.cartes += jour.cards_sold;
    parMembre.set(jour.member_id, courant);
  }

  const classement: PointSerie[] = [...parMembre.entries()]
    .map(([memberId, valeurs]) => ({
      label: noms.get(memberId) ?? "Membre",
      valeur: valeurs.ca,
      detail: `${valeurs.cartes} carte${valeurs.cartes > 1 ? "s" : ""}`,
    }))
    .sort((a, b) => b.valeur - a.valeur);

  return (
    <div className="montee space-y-6">
      <EnTete
        surtitre={`${PERIODE_LABEL[periode]} · ${from} → ${to}`}
        titre="Analytics"
      />

      {/* Filtres en GET : l'URL décrit la vue, donc elle se partage et se met
          en favori. Un état React local ne ferait ni l'un ni l'autre. */}
      <form method="get" className="panneau space-y-3 p-4">
        <div className="flex flex-wrap gap-2">
          {(Object.keys(PERIODE_LABEL) as PeriodeId[]).map((id) => (
            <button
              key={id}
              type="submit"
              name="periode"
              value={id}
              className={`btn px-3 py-2 text-sm ${
                periode === id ? "btn-primaire" : "btn-fantome"
              }`}
            >
              {PERIODE_LABEL[id]}
            </button>
          ))}
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label className="libelle" htmlFor="debut">
              Du
            </label>
            <input
              id="debut"
              name="debut"
              type="date"
              defaultValue={params.debut ?? from}
              className="champ"
            />
          </div>
          <div>
            <label className="libelle" htmlFor="fin">
              Au
            </label>
            <input
              id="fin"
              name="fin"
              type="date"
              defaultValue={params.fin ?? to}
              className="champ"
            />
          </div>
          <div>
            <label className="libelle" htmlFor="membre">
              Membre
            </label>
            <select
              id="membre"
              name="membre"
              defaultValue={membreId ?? ""}
              className="champ"
            >
              <option value="">Toute l&apos;équipe</option>
              {profiles.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.full_name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          type="submit"
          name="periode"
          value="personnalisee"
          className="btn w-full py-2.5 text-sm"
        >
          Appliquer la période personnalisée
        </button>
      </form>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="CA" valeur={formatCentsShort(totaux.revenue_cents)} accent />
        <Stat
          label="Commissions"
          valeur={formatCentsShort(totaux.commission_cents)}
          detail={formatRate(settings.commission_rate_bp)}
        />
        <Stat label="Cartes vendues" valeur={totaux.cards_sold} />
        <Stat
          label="Net commerciaux"
          valeur={formatCentsShort(totaux.net_cents)}
        />
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Jours travaillés" valeur={totaux.days_worked} />
        <Stat
          label="Objectifs atteints"
          valeur={totaux.goals_reached}
          detail={`${totaux.goals_missed} manqué(s)`}
        />
        <Stat
          label="Temps travaillé"
          valeur={formatDuration(totaux.worked_seconds)}
        />
        <Stat label="Commerces visités" valeur={totaux.businesses_visited} />
      </div>

      <Section titre="Chiffre d'affaires par jour">
        <Histogramme points={serieCA} format="montant" />
      </Section>

      <Section titre="Cartes vendues par jour">
        <Histogramme points={serieCartes} format="nombre" hauteur={110} />
      </Section>

      {!membreId ? (
        <Section
          titre={
            isAdmin(viewer.role)
              ? "Classement de l'équipe"
              : "Progression de l'équipe"
          }
        >
          <Classement points={classement} format="montant" />
        </Section>
      ) : null}
    </div>
  );
}
