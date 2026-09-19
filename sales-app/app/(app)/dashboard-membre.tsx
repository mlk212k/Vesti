import Link from "next/link";
import { IconChevron, IconClock, IconPlus, IconTarget } from "@/components/icons";
import { Jauge, Section, Stat, StatutJournee, Vide } from "@/components/ui";
import { formatDuration, formatTime } from "@/lib/format";
import { formatCents, formatCentsShort, formatRate, percentOf } from "@/lib/money";
import type { SaleWithBusiness } from "@/lib/queries";
import type { SessionUser } from "@/lib/auth";
import {
  displayDayStatus,
  type AppSettings,
  type MemberCards,
  type WorkDayStats,
} from "@/lib/types";
import { BoutonCommencer, BoutonTerminer } from "./journee-boutons";

function salutation(): string {
  const heure = Number(
    new Intl.DateTimeFormat("fr-FR", {
      hour: "numeric",
      hour12: false,
      timeZone: "Europe/Paris",
    }).format(new Date()),
  );
  if (heure < 6) return "Bonne nuit";
  if (heure < 18) return "Bonjour";
  return "Bonsoir";
}

export function DashboardMembre({
  user,
  day,
  cards,
  settings,
  sales,
}: {
  user: SessionUser;
  day: WorkDayStats | null;
  cards: MemberCards;
  settings: AppSettings;
  sales: SaleWithBusiness[];
}) {
  const statut = displayDayStatus(day);
  const objectif = day?.goal_cards ?? user.daily_goal_override ?? settings.default_daily_goal;
  const vendues = day?.cards_sold ?? 0;
  const pourcentage = percentOf(vendues, objectif);
  const restantes = Math.max(objectif - vendues, 0);

  return (
    <div className="space-y-6">
      <header className="montee">
        <p className="surtitre">{salutation()}</p>
        <h1 className="titre mt-1 text-3xl sm:text-4xl">{user.full_name}</h1>
      </header>

      {/* Le panneau de la journée : tout ce qu'un commercial a besoin de voir
          en ouvrant l'app, sans faire défiler. */}
      <section className="panneau-heros diagonale montee retard-1 p-5 sm:p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <p className="surtitre">Ma journée</p>
          <StatutJournee statut={statut} />
        </div>

        <div className="mb-2 flex items-end gap-3">
          <span className="chiffre text-6xl sm:text-7xl">{vendues}</span>
          <span className="chiffre pb-2 text-2xl text-faint">/ {objectif}</span>
          <span className="pb-2.5 text-sm text-dim">cartes</span>
        </div>

        <Jauge valeur={vendues} objectif={objectif} />

        <p className="mt-2.5 text-sm text-dim">
          <span className="tabulaire font-semibold text-text">{pourcentage} %</span>
          {restantes > 0 ? (
            <>
              {" · "}
              {restantes} carte{restantes > 1 ? "s" : ""} restante
              {restantes > 1 ? "s" : ""}
            </>
          ) : (
            " · objectif dépassé"
          )}
        </p>

        <div className="mt-5 grid grid-cols-3 gap-2 sm:gap-3">
          <div className="panneau-creux p-3">
            <p className="surtitre">CA</p>
            <p className="chiffre mt-1.5 text-xl sm:text-2xl">
              {formatCentsShort(day?.revenue_cents ?? 0)}
            </p>
          </div>
          <div className="panneau-creux p-3">
            <p className="surtitre">Commission</p>
            <p className="chiffre mt-1.5 text-xl text-faint sm:text-2xl">
              {formatCentsShort(day?.commission_cents ?? 0)}
            </p>
          </div>
          <div className="panneau-creux p-3">
            <p className="surtitre">Mon net</p>
            <p className="chiffre mt-1.5 bg-gradient-to-br from-[#c4b5fd] to-[#ff8ec0] bg-clip-text text-xl text-transparent sm:text-2xl">
              {formatCentsShort(day?.net_cents ?? 0)}
            </p>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-faint">
          <span className="inline-flex items-center gap-1.5">
            <IconClock className="h-3.5 w-3.5" />
            {day ? formatDuration(day.duration_seconds) : "—"}
            {day ? ` · depuis ${formatTime(day.started_at)}` : ""}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <IconTarget className="h-3.5 w-3.5" />
            Commission chef : {formatRate(settings.commission_rate_bp)}
          </span>
        </div>

        <div className="mt-5">
          {statut === "in_progress" ? (
            <BoutonTerminer />
          ) : statut === "validated" ? (
            <p className="panneau-creux px-4 py-3 text-center text-sm text-dim">
              Journée validée par l&apos;encadrement.
              {day && day.penalty_cents > 0
                ? ` Retenue appliquée : ${formatCents(day.penalty_cents)}.`
                : ""}
            </p>
          ) : (
            <BoutonCommencer />
          )}
        </div>
      </section>

      {/* Cartes en main : le commercial doit savoir ce qu'il lui reste à
          vendre avant de sonner à la prochaine porte. */}
      <div className="montee retard-2 grid grid-cols-3 gap-3">
        <Stat label="En main" valeur={cards.held} accent />
        <Stat label="Attribuées" valeur={cards.allocated} />
        <Stat label="Vendues" valeur={cards.sold} />
      </div>

      {statut === "in_progress" ? (
        <Link
          href="/ventes/nouvelle"
          className="btn btn-primaire montee retard-2 w-full py-4 text-base"
        >
          <IconPlus className="h-5 w-5" />
          Nouvelle vente
        </Link>
      ) : null}

      <div className="montee retard-3">
        <Section
          titre="Mes ventes du jour"
          action={
            <Link href="/ventes" className="text-xs text-faint hover:text-dim">
              Tout voir
            </Link>
          }
        >
          {sales.length === 0 ? (
            <Vide titre="Aucune vente aujourd'hui">
              {statut === "in_progress"
                ? "Le bouton « Nouvelle vente » est juste au-dessus."
                : "Commence ta journée pour enregistrer une vente."}
            </Vide>
          ) : (
            <ul className="space-y-2">
              {sales.map((sale) => (
                <li key={sale.id} className="panneau flex items-center gap-3 p-3.5">
                  <span className="chiffre w-10 shrink-0 text-center text-xl">
                    {sale.quantity}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {sale.businesses?.name ?? "Vente directe"}
                    </p>
                    <p className="text-xs text-faint">
                      {formatTime(sale.sold_at)}
                      {sale.businesses?.city ? ` · ${sale.businesses.city}` : ""}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="chiffre text-base">
                      {formatCentsShort(sale.amount_cents)}
                    </p>
                    <p className="text-[11px] text-faint">
                      net {formatCentsShort(sale.net_cents)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>

      <div className="montee retard-4 grid gap-3 sm:grid-cols-3">
        <RaccourciLien href="/commerces" titre="Mes commerces" />
        <RaccourciLien href="/historique" titre="Mon historique" />
        <RaccourciLien href="/cartes" titre="Mes cartes" />
      </div>
    </div>
  );
}

function RaccourciLien({ href, titre }: { href: string; titre: string }) {
  return (
    <Link
      href={href}
      className="panneau flex items-center justify-between p-4 transition-transform active:scale-[0.99]"
    >
      <span className="titre text-sm">{titre}</span>
      <IconChevron className="h-4 w-4 text-faint" />
    </Link>
  );
}
