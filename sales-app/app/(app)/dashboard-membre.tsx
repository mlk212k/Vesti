import Link from "next/link";
import { IconChevron, IconClock, IconPlus } from "@/components/icons";
import { IconNFC } from "@/components/nfc";
import { CodeBarres, Jauge, Section, Stat, StatutJournee, Vide } from "@/components/ui";
import { formatDateLong, formatDuration, formatTime } from "@/lib/format";
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

// Une ligne de reçu : libellé à gauche, montant à droite, pointillés entre
// les deux. C'est la forme que prend l'argent dans cette app.
function LigneTicket({
  label,
  valeur,
  total = false,
}: {
  label: string;
  valeur: string;
  total?: boolean;
}) {
  return (
    <div className={`ligne-ticket ${total ? "ligne-ticket-total" : ""}`}>
      <span className={total ? "" : "text-dim"}>{label}</span>
      <span className="ligne-ticket-points" />
      <span className="tabulaire">{valeur}</span>
    </div>
  );
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
  const objectif =
    day?.goal_cards ?? user.daily_goal_override ?? settings.default_daily_goal;
  const vendues = day?.cards_sold ?? 0;
  const pourcentage = percentOf(vendues, objectif);
  const restantes = Math.max(objectif - vendues, 0);

  return (
    <div className="space-y-6">
      <header className="montee">
        <p className="surtitre">{salutation()}</p>
        <h1 className="titre mt-1 text-5xl">{user.full_name}</h1>
      </header>

      {/* LE TICKET. Tout ce qu'un commercial a besoin de voir en ouvrant
          l'app tient dedans, sans faire défiler. */}
      <section className="ticket impression retard-1">
        <p className="entete-ticket">{settings.team_name}</p>
        <p className="mt-1 text-center font-mono text-[10px] tracking-widest text-faint uppercase">
          {day ? formatDateLong(day.work_date) : formatDateLong(new Date())}
        </p>

        <div className="perfo my-4" />

        <div className="flex items-center justify-between gap-3">
          <p className="surtitre">Ma journée</p>
          <StatutJournee statut={statut} />
        </div>

        <div className="mt-3 flex items-end gap-2">
          <span className="chiffre text-7xl text-lime">{vendues}</span>
          <span className="chiffre pb-2 text-2xl text-faint">/ {objectif}</span>
          <span className="pb-2.5 font-mono text-xs tracking-widest text-dim uppercase">
            cartes
          </span>
        </div>

        <div className="mt-3">
          <Jauge valeur={vendues} objectif={objectif} />
        </div>

        <p className="mt-2.5 font-mono text-xs text-dim">
          <span className="font-bold text-os">{pourcentage} %</span>
          {restantes > 0
            ? ` · ${restantes} carte${restantes > 1 ? "s" : ""} restante${restantes > 1 ? "s" : ""}`
            : " · objectif dépassé"}
        </p>

        <div className="perfo my-4" />

        <div className="space-y-2">
          <LigneTicket
            label="Chiffre d'affaires"
            valeur={formatCents(day?.revenue_cents ?? 0)}
          />
          <LigneTicket
            label={`Commission chef ${formatRate(settings.commission_rate_bp)}`}
            valeur={`- ${formatCents(day?.commission_cents ?? 0)}`}
          />
          <div className="perfo my-3" />
          <LigneTicket
            label="Mon net"
            valeur={formatCents(day?.net_cents ?? 0)}
            total
          />
        </div>

        <div className="perfo my-4" />

        <div className="flex items-center justify-between font-mono text-[11px] text-faint">
          <span className="inline-flex items-center gap-1.5">
            <IconClock className="h-3.5 w-3.5" />
            {day ? formatDuration(day.duration_seconds) : "—"}
          </span>
          <span>{day ? `ouverte à ${formatTime(day.started_at)}` : "fermée"}</span>
        </div>

        {/* Le code-barres signe le ticket. Tiré de l'identifiant de la
            journée : deux journées n'ont jamais le même. */}
        <div className="mt-4 flex justify-center">
          <CodeBarres valeur={day?.id ?? user.id} className="h-7" />
        </div>

        <div className="mt-5">
          {statut === "in_progress" ? (
            <BoutonTerminer />
          ) : statut === "validated" ? (
            <p className="panneau-creux px-4 py-3 text-center font-mono text-xs text-dim">
              Journée validée par l&apos;encadrement.
              {day && day.penalty_cents > 0
                ? ` Retenue : ${formatCents(day.penalty_cents)}.`
                : ""}
            </p>
          ) : (
            <BoutonCommencer />
          )}
        </div>
      </section>

      {statut === "in_progress" ? (
        <Link
          href="/ventes/nouvelle"
          className="btn btn-primaire montee retard-2 w-full py-4 text-base"
        >
          <IconPlus className="h-5 w-5" />
          Nouvelle vente
        </Link>
      ) : null}

      {/* Cartes en main : à savoir avant de sonner à la prochaine porte. */}
      <div className="montee retard-2 grid grid-cols-3 gap-3">
        <Stat
          label="En main"
          valeur={
            <span className="flex items-center gap-2">
              <IconNFC className="h-5 w-5 text-nfc" />
              {cards.held}
            </span>
          }
          accent
        />
        <Stat label="Reçues" valeur={cards.allocated} />
        <Stat label="Vendues" valeur={cards.sold} />
      </div>

      <div className="montee retard-3">
        <Section
          titre="Mes ventes du jour"
          action={
            <Link href="/ventes" className="font-mono text-[11px] text-faint hover:text-dim">
              TOUT VOIR
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
            <ul className="space-y-1.5">
              {sales.map((sale) => (
                <li
                  key={sale.id}
                  className="panneau-plat flex items-center gap-3 px-3.5 py-3"
                >
                  <span className="chiffre w-8 shrink-0 text-center text-lg text-lime">
                    {sale.quantity}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">
                      {sale.businesses?.name ?? "Vente directe"}
                    </p>
                    <p className="font-mono text-[11px] text-faint">
                      {formatTime(sale.sold_at)}
                      {sale.businesses?.city ? ` · ${sale.businesses.city}` : ""}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="chiffre text-base">
                      {formatCentsShort(sale.amount_cents)}
                    </p>
                    <p className="font-mono text-[10px] text-faint">
                      net {formatCentsShort(sale.net_cents)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>

      <div className="montee retard-4 grid gap-2 sm:grid-cols-3">
        <Raccourci href="/commerces" titre="Mes commerces" />
        <Raccourci href="/historique" titre="Mon historique" />
        <Raccourci href="/cartes" titre="Mes cartes" />
      </div>
    </div>
  );
}

function Raccourci({ href, titre }: { href: string; titre: string }) {
  return (
    <Link
      href={href}
      className="panneau flex items-center justify-between p-4 transition-transform active:scale-[0.99]"
    >
      <span className="titre text-lg">{titre}</span>
      <IconChevron className="h-4 w-4 text-faint" />
    </Link>
  );
}
