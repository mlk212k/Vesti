import Link from "next/link";
import { Mot, Section, Stat, StatutJournee, Vide } from "@/components/ui";
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
import { BoutonTerminer } from "./journee-boutons";
import { ObjetJournee } from "./objet-journee";

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

/**
 * L'écran du commercial.
 *
 * Il tient en une idée : UN OBJET AU MILIEU DU VIDE, et le strict minimum
 * autour. Ce qu'on voit en ouvrant l'app, c'est la carte — son état est
 * celui de la journée, la tranche qui se charge est l'objectif. Il n'y a
 * pas de bouton « commencer ma journée » à côté : l'objet est l'action.
 *
 * Les chiffres arrivent ensuite, en descendant, sans jamais entrer dans une
 * boîte. Tous sont calculés en base (colonnes générées de `sales`) : cet
 * écran ne fait que les mettre en forme.
 */
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
  const prenom = user.full_name.split(" ")[0] ?? user.full_name;

  // La charge de la tranche. Bornée à 1 : au-delà de l'objectif, c'est la
  // matière qui déborde (les crans bonus), pas la tranche qui dépasse.
  const charge = objectif > 0 ? Math.min(1, vendues / objectif) : 0;

  const etat =
    statut === "in_progress"
      ? "en_cours"
      : statut === "not_started"
        ? "fermee"
        : "close";

  return (
    <div className="space-y-14 pt-2">
      {/* --- L'OBJET -------------------------------------------------------
          Il occupe presque tout le premier écran, et rien d'autre n'y est
          posé. Le grand mot passe derrière lui : on le devine, on ne le lit
          pas. */}
      <section className="montee relative">
        <div className="pointer-events-none absolute inset-x-0 top-10 flex justify-center overflow-hidden">
          <Mot plein className="text-[clamp(5rem,30vw,13rem)]">
            {vendues > 0 ? vendues : prenom}
          </Mot>
        </div>

        <header className="relative mb-8">
          <p className="surtitre">
            {salutation()} · {day ? formatDateLong(day.work_date) : formatDateLong(new Date())}
          </p>
          <h1 className="titre mt-2 text-[clamp(2.4rem,12vw,4rem)]">{prenom}</h1>
        </header>

        <div className="relative mx-auto max-w-sm">
          <ObjetJournee charge={charge} etat={etat}>
            {/* Ce qui est GRAVÉ dans la dalle : le décompte, et rien
                d'autre. Une carte de crédit ne porte pas un tableau. */}
            <div className="flex h-full flex-col justify-between p-[7%]">
              <div className="flex items-start justify-between">
                <span className="surtitre text-[0.55rem]">{settings.team_name}</span>
                <StatutJournee statut={statut} />
              </div>
              <div className="flex items-end gap-2">
                <span className="chiffre text-[clamp(3rem,17vw,4.5rem)] text-os">
                  {vendues}
                </span>
                <span className="chiffre pb-1.5 text-xl text-cendre">/ {objectif}</span>
              </div>
            </div>
          </ObjetJournee>
        </div>

        <p className="mt-6 text-center font-mono text-[11px] text-faint">
          <span className="text-os">{pourcentage} %</span>
          {restantes > 0
            ? ` · ${restantes} carte${restantes > 1 ? "s" : ""} restante${restantes > 1 ? "s" : ""}`
            : " · objectif dépassé"}
          {day ? ` · ${formatDuration(day.duration_seconds)}` : ""}
        </p>
      </section>

      {/* --- L'ARGENT ------------------------------------------------------
          Un seul nombre en grand, et c'est celui qui appartient à la
          personne qui regarde. Le CA et la commission sont le détail du
          calcul : ils passent en toute petite ligne technique, comme tout
          ce qui explique sans être le sujet. */}
      <section className="montee retard-1 text-center">
        <p className="surtitre">Mon net</p>
        <p className="chiffre mt-2 text-[clamp(2.6rem,16vw,4.5rem)] text-braise">
          {formatCents(day?.net_cents ?? 0)}
        </p>
        <p className="mt-3 font-mono text-[11px] text-faint">
          CA {formatCents(day?.revenue_cents ?? 0)} · commission{" "}
          {formatRate(settings.commission_rate_bp)} −
          {formatCents(day?.commission_cents ?? 0)}
        </p>
      </section>

      {/* La clôture reste un bouton : ce n'est pas un geste qu'on veut
          pouvoir déclencher en manipulant l'objet par jeu. */}
      {statut === "in_progress" ? (
        <div className="montee retard-2 mx-auto max-w-sm">
          <BoutonTerminer />
        </div>
      ) : statut === "validated" ? (
        <p className="montee retard-2 text-center font-mono text-xs text-faint">
          Journée validée par l&apos;encadrement.
          {day && day.penalty_cents > 0
            ? ` Retenue : ${formatCents(day.penalty_cents)}.`
            : ""}
        </p>
      ) : null}

      {/* --- LES CARTES EN MAIN --------------------------------------------
          Aucun accent ici : la jauge d'objectif, c'est la tranche de la
          dalle. En afficher une seconde affaiblirait les deux. */}
      <section className="montee retard-2 grid grid-cols-3 gap-5">
        <Stat label="En main" valeur={cards.held} />
        <Stat label="Reçues" valeur={cards.allocated} />
        <Stat label="Vendues" valeur={cards.sold} />
      </section>

      {/* --- LES VENTES ---------------------------------------------------- */}
      <div className="montee retard-3">
        <Section
          titre="Mes ventes du jour"
          action={
            <Link href="/ventes" className="surtitre hover:text-os">
              Tout voir
            </Link>
          }
        >
          {sales.length === 0 ? (
            <Vide titre="Rien encore">
              {statut === "in_progress"
                ? "Un appui long sur la carte ouvre une vente."
                : "Ouvre ta journée pour enregistrer une vente."}
            </Vide>
          ) : (
            <ul>
              {sales.map((sale) => (
                <li
                  key={sale.id}
                  className="flex items-center gap-4 border-b border-trait py-4"
                >
                  <span className="chiffre w-7 shrink-0 text-lg text-dim">
                    {sale.quantity}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">
                      {sale.businesses?.name ?? "Vente directe"}
                    </p>
                    <p className="surtitre mt-0.5">
                      {formatTime(sale.sold_at)}
                      {sale.businesses?.city ? ` · ${sale.businesses.city}` : ""}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="chiffre text-base">
                      {formatCentsShort(sale.amount_cents)}
                    </p>
                    <p className="surtitre mt-0.5">
                      net {formatCentsShort(sale.net_cents)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>

      {/* --- LE RESTE, en tout petit --------------------------------------- */}
      <nav className="montee retard-4 flex flex-wrap gap-x-8 gap-y-3 pb-4">
        <Raccourci href="/commerces" titre="Mes commerces" />
        <Raccourci href="/historique" titre="Mon historique" />
        <Raccourci href="/cartes" titre="Mes cartes" />
      </nav>
    </div>
  );
}

function Raccourci({ href, titre }: { href: string; titre: string }) {
  return (
    <Link
      href={href}
      className="surtitre transition-colors duration-300 hover:text-os"
    >
      {titre}
    </Link>
  );
}
