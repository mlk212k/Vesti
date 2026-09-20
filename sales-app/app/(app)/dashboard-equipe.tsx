import Link from "next/link";
import { IconChevron } from "@/components/icons";
import { Avatar, Jauge, Mot, Section, Stat, StatutJournee, Vide } from "@/components/ui";
import { formatDuration } from "@/lib/format";
import { formatCents, formatCentsShort, formatRate } from "@/lib/money";
import type { LignePlanning, TeamRow } from "@/lib/queries";
import {
  displayDayStatus,
  ROLE_LABEL,
  type AppSettings,
  type StockSummary,
} from "@/lib/types";

/**
 * L'écran de l'encadrement.
 *
 * Admin et manager partagent la même vue ; seule la ligne « commission » et
 * les raccourcis d'administration sont réservés à l'admin — c'est son
 * argent et ses réglages.
 *
 * Ici l'objet central n'est pas une carte mais un CHIFFRE : le CA du jour,
 * en très grand, seul au milieu du vide. Tout le reste descend derrière lui
 * par ordre d'urgence : qui manque à l'appel, qui vend, ce qu'il reste au
 * dépôt.
 */
export function DashboardEquipe({
  rows,
  settings,
  stock,
  estAdmin,
  prenom,
  planning,
}: {
  rows: TeamRow[];
  settings: AppSettings;
  stock: StockSummary;
  estAdmin: boolean;
  prenom: string;
  planning: LignePlanning[];
}) {
  const attendus = planning.filter((p) => p.attendu);
  const manquants = attendus.filter((p) => !p.journee_ouverte);
  const caJour = rows.reduce((total, row) => total + (row.day?.revenue_cents ?? 0), 0);
  const commissionJour = rows.reduce(
    (total, row) => total + (row.day?.commission_cents ?? 0),
    0,
  );
  const cartesVendues = rows.reduce((total, row) => total + (row.day?.cards_sold ?? 0), 0);
  const actifs = rows.filter((row) => row.day?.status === "in_progress").length;
  const objectifsAtteints = rows.filter((row) => row.day?.goal_reached).length;
  const journeesDuJour = rows.filter((row) => row.day).length;

  // Les commerciaux en haut, triés par CA du jour : la liste raconte la
  // journée dès la première ligne.
  const classement = [...rows].sort(
    (a, b) => (b.day?.revenue_cents ?? 0) - (a.day?.revenue_cents ?? 0),
  );

  return (
    <div className="space-y-14 pt-2">
      {/* --- LE CHIFFRE ----------------------------------------------------
          Un seul nombre, énorme, avec le mot-matière derrière. C'est la
          seule chose qu'on doit voir en ouvrant l'app. */}
      <section className="montee relative">
        <div className="pointer-events-none absolute inset-x-0 top-16 flex justify-center overflow-hidden">
          <Mot className="text-[clamp(5rem,28vw,12rem)]">{settings.team_name}</Mot>
        </div>

        <p className="surtitre relative">
          Aujourd&apos;hui · {journeesDuJour} journée{journeesDuJour > 1 ? "s" : ""}{" "}
          sur {rows.length} membre{rows.length > 1 ? "s" : ""}
        </p>

        <p className="chiffre relative mt-6 text-[clamp(3.4rem,20vw,7rem)] text-os">
          {formatCentsShort(caJour)}
        </p>
        <p className="surtitre relative mt-3">
          Chiffre d&apos;affaires · {cartesVendues} carte
          {cartesVendues > 1 ? "s" : ""} vendue{cartesVendues > 1 ? "s" : ""}
        </p>

        <p className="relative mt-8 text-sm text-faint">
          Salut {prenom}.
        </p>
      </section>

      <section className="montee retard-1 grid grid-cols-3 gap-5">
        {estAdmin ? (
          <Stat
            label="Ma commission"
            valeur={formatCentsShort(commissionJour)}
            detail={`${formatRate(settings.commission_rate_bp)} du CA`}
          />
        ) : (
          <Stat label="Cartes vendues" valeur={cartesVendues} detail="aujourd'hui" />
        )}
        <Stat
          label="En tournée"
          valeur={actifs}
          detail={actifs > 0 ? "journée en cours" : "personne dehors"}
        />
        <Stat
          label="Objectifs atteints"
          valeur={`${objectifsAtteints}/${journeesDuJour}`}
          detail={`objectif ${settings.default_daily_goal}`}
        />
      </section>

      {/* --- QUI MANQUE ----------------------------------------------------
          Sans cette ligne, l'encadrement ne sait pas si une journée non
          ouverte est un retard ou un jour de repos. */}
      <Link
        href="/planning"
        className="montee retard-1 group flex items-center gap-4 border-y border-trait py-5"
      >
        <div className="min-w-0 flex-1">
          <p className="surtitre">Planning du jour</p>
          <p className="mt-2 text-sm">
            <span className="chiffre text-os">{attendus.length}</span> attendu
            {attendus.length > 1 ? "s" : ""}
            {manquants.length > 0 ? (
              <>
                {" · "}
                <span className="chiffre text-braise">{manquants.length}</span> pas
                encore en route
              </>
            ) : (
              " · tout le monde est parti"
            )}
          </p>
        </div>
        <span className={manquants.length > 0 ? "pastille pastille-vive" : "pastille"}>
          {manquants.length > 0 ? "À relancer" : "Complet"}
        </span>
        <IconChevron className="h-4 w-4 shrink-0 text-cendre transition-transform duration-500 group-hover:translate-x-1" />
      </Link>

      {/* --- L'ÉQUIPE ------------------------------------------------------ */}
      <div className="montee retard-2">
        <Section
          titre="L'équipe aujourd'hui"
          action={
            <Link href="/equipe" className="surtitre hover:text-os">
              Vue détaillée
            </Link>
          }
        >
          {classement.length === 0 ? (
            <Vide titre="Personne">
              Crée les comptes de ton équipe depuis la page Membres.
            </Vide>
          ) : (
            <ul>
              {classement.map((row, index) => (
                <li key={row.profile.id}>
                  <LigneEquipe
                    row={row}
                    estAdmin={estAdmin}
                    objectifParDefaut={settings.default_daily_goal}
                    rang={(row.day?.revenue_cents ?? 0) > 0 ? index + 1 : null}
                  />
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>

      {/* --- LE STOCK ------------------------------------------------------ */}
      <div className="montee retard-3 pb-4">
        <Section
          titre="Stock de cartes"
          action={
            <Link href="/stock" className="surtitre hover:text-os">
              Gérer
            </Link>
          }
        >
          <div className="grid grid-cols-3 gap-5">
            <Stat label="Au dépôt" valeur={stock.in_warehouse} />
            <Stat label="En circulation" valeur={stock.held_by_members} />
            <Stat label="Vendues au total" valeur={stock.sold} />
          </div>
        </Section>
      </div>
    </div>
  );
}

function LigneEquipe({
  row,
  estAdmin,
  objectifParDefaut,
  rang,
}: {
  row: TeamRow;
  estAdmin: boolean;
  objectifParDefaut: number;
  rang: number | null;
}) {
  const { profile, day, cards } = row;
  // Quelqu'un qui n'a pas ouvert sa journée n'a pas d'objectif figé : on
  // affiche celui qui s'appliquera, plutôt qu'un tiret.
  const objectif =
    day?.goal_cards ?? profile.daily_goal_override ?? objectifParDefaut;
  const vendues = day?.cards_sold ?? 0;

  return (
    <Link
      href={`/equipe/${profile.id}`}
      className="group block border-b border-trait py-5 transition-transform duration-300 active:scale-[0.99]"
    >
      <div className="flex items-center gap-4">
        {/* Le rang n'est pas une médaille collée sur l'avatar : c'est un
            numéro d'ordre, en petit, à sa place — à gauche de la ligne. */}
        <span className="w-4 shrink-0 font-mono text-[11px] text-cendre">
          {rang ?? "·"}
        </span>
        <Avatar nom={profile.full_name} />

        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px]">{profile.full_name}</p>
          <p className="surtitre mt-1">
            {ROLE_LABEL[profile.role]}
            {cards ? ` · ${cards.held} en main` : ""}
          </p>
        </div>

        <div className="text-right">
          <p className="chiffre text-lg">
            {day ? formatCentsShort(day.revenue_cents) : "—"}
          </p>
          {estAdmin && day ? (
            <p className="surtitre mt-1">dont {formatCents(day.commission_cents)}</p>
          ) : null}
        </div>

        <IconChevron className="h-4 w-4 shrink-0 text-cendre transition-transform duration-500 group-hover:translate-x-1" />
      </div>

      <div className="mt-4 flex items-center gap-4 pl-8">
        <span className="w-12 shrink-0 font-mono text-[11px] text-faint">
          {vendues}/{objectif}
        </span>
        <div className="flex-1">
          {objectif > 0 ? <Jauge valeur={vendues} objectif={objectif} /> : null}
        </div>
        <span className="w-12 shrink-0 text-right font-mono text-[11px] text-faint">
          {day ? formatDuration(day.duration_seconds) : ""}
        </span>
        <StatutJournee statut={displayDayStatus(day)} />
      </div>
    </Link>
  );
}
