import Link from "next/link";
import { IconChevron } from "@/components/icons";
import { Avatar, Jauge, Section, Stat, StatutJournee, Vide } from "@/components/ui";
import { formatDuration } from "@/lib/format";
import { formatCents, formatCentsShort, formatRate } from "@/lib/money";
import type { TeamRow } from "@/lib/queries";
import {
  displayDayStatus,
  ROLE_LABEL,
  type AppSettings,
  type StockSummary,
} from "@/lib/types";

// Tableau de bord de l'encadrement. Admin et manager partagent la même vue ;
// seule la colonne « commission » et les raccourcis d'administration sont
// réservés à l'admin — c'est son argent et ses réglages.
export function DashboardEquipe({
  rows,
  settings,
  stock,
  estAdmin,
  prenom,
}: {
  rows: TeamRow[];
  settings: AppSettings;
  stock: StockSummary;
  estAdmin: boolean;
  prenom: string;
}) {
  const caJour = rows.reduce((total, row) => total + (row.day?.revenue_cents ?? 0), 0);
  const commissionJour = rows.reduce(
    (total, row) => total + (row.day?.commission_cents ?? 0),
    0,
  );
  const cartesVendues = rows.reduce((total, row) => total + (row.day?.cards_sold ?? 0), 0);
  const actifs = rows.filter((row) => row.day?.status === "in_progress").length;
  const objectifsAtteints = rows.filter((row) => row.day?.goal_reached).length;
  const journeesDuJour = rows.filter((row) => row.day).length;

  // Les commerciaux en haut, triés par CA du jour : le tableau raconte la
  // journée dès la première ligne.
  const classement = [...rows].sort(
    (a, b) => (b.day?.revenue_cents ?? 0) - (a.day?.revenue_cents ?? 0),
  );

  return (
    <div className="space-y-6">
      <header className="montee">
        <p className="surtitre">Aujourd&apos;hui · {settings.team_name}</p>
        <h1 className="titre mt-1 text-3xl sm:text-4xl">
          {estAdmin ? "Poste de commandement" : "Supervision"}
        </h1>
        <p className="mt-1.5 text-sm text-faint">
          Salut {prenom} — {journeesDuJour} journée{journeesDuJour > 1 ? "s" : ""}{" "}
          ouverte{journeesDuJour > 1 ? "s" : ""} sur {rows.length} membre
          {rows.length > 1 ? "s" : ""}.
        </p>
      </header>

      <div className="montee retard-1 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          label="CA du jour"
          valeur={formatCentsShort(caJour)}
          detail={`${cartesVendues} carte${cartesVendues > 1 ? "s" : ""} vendue${cartesVendues > 1 ? "s" : ""}`}
          accent
        />
        {estAdmin ? (
          <Stat
            label="Ma commission"
            valeur={formatCentsShort(commissionJour)}
            detail={`${formatRate(settings.commission_rate_bp)} du CA`}
          />
        ) : (
          <Stat
            label="Cartes vendues"
            valeur={cartesVendues}
            detail="aujourd'hui"
          />
        )}
        <Stat
          label="En tournée"
          valeur={actifs}
          detail={actifs > 0 ? "journée en cours" : "personne sur le terrain"}
        />
        <Stat
          label="Objectifs atteints"
          valeur={`${objectifsAtteints}/${journeesDuJour}`}
          detail={`objectif ${settings.default_daily_goal} cartes`}
        />
      </div>

      <div className="montee retard-2">
        <Section
          titre="L'équipe aujourd'hui"
          action={
            <Link href="/equipe" className="text-xs text-faint hover:text-dim">
              Vue détaillée
            </Link>
          }
        >
          {classement.length === 0 ? (
            <Vide titre="Aucun membre">
              Crée les comptes de ton équipe depuis la page Membres.
            </Vide>
          ) : (
            <ul className="space-y-2">
              {classement.map((row) => (
                <li key={row.profile.id}>
                  <LigneEquipe row={row} estAdmin={estAdmin} />
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>

      <div className="montee retard-3">
        <Section
          titre="Stock de cartes"
          action={
            <Link href="/stock" className="text-xs text-faint hover:text-dim">
              Gérer
            </Link>
          }
        >
          <div className="grid grid-cols-3 gap-3">
            <Stat label="Au dépôt" valeur={stock.in_warehouse} />
            <Stat label="En circulation" valeur={stock.held_by_members} />
            <Stat label="Vendues au total" valeur={stock.sold} />
          </div>
        </Section>
      </div>
    </div>
  );
}

function LigneEquipe({ row, estAdmin }: { row: TeamRow; estAdmin: boolean }) {
  const { profile, day, cards } = row;
  const objectif = day?.goal_cards ?? profile.daily_goal_override ?? 0;
  const vendues = day?.cards_sold ?? 0;

  return (
    <Link
      href={`/equipe/${profile.id}`}
      className="panneau block p-4 transition-transform active:scale-[0.99]"
    >
      <div className="flex items-center gap-3">
        <Avatar nom={profile.full_name} />

        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{profile.full_name}</p>
          <p className="text-xs text-faint">
            {ROLE_LABEL[profile.role]}
            {cards ? ` · ${cards.held} carte${cards.held > 1 ? "s" : ""} en main` : ""}
          </p>
        </div>

        <div className="text-right">
          <p className="chiffre text-lg">
            {day ? formatCentsShort(day.revenue_cents) : "—"}
          </p>
          {estAdmin && day ? (
            <p className="text-[11px] text-faint">
              dont {formatCents(day.commission_cents)}
            </p>
          ) : null}
        </div>

        <IconChevron className="h-4 w-4 shrink-0 text-faint" />
      </div>

      <div className="mt-3 flex items-center gap-3">
        <span className="chiffre w-14 shrink-0 text-sm text-dim">
          {vendues} / {objectif || "—"}
        </span>
        <div className="flex-1">
          {objectif > 0 ? <Jauge valeur={vendues} objectif={objectif} /> : null}
        </div>
        <span className="w-14 shrink-0 text-right text-[11px] text-faint">
          {day ? formatDuration(day.duration_seconds) : ""}
        </span>
      </div>

      <div className="mt-2.5">
        <StatutJournee statut={displayDayStatus(day)} />
      </div>
    </Link>
  );
}
