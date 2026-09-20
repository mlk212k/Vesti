import Link from "next/link";
import { IconChevron } from "@/components/icons";
import { CarteJoueur } from "@/components/carte-joueur";
import { Compteur } from "@/components/compteur";
import { Mot, Section, Vide } from "@/components/ui";
import { formatRate } from "@/lib/money";
import type { LignePlanning, TeamRow } from "@/lib/queries";
import type { AppSettings, StockSummary } from "@/lib/types";

/**
 * L'écran de l'encadrement — Mohamed (admin) et Malik (manager).
 *
 * C'est un TABLEAU DE SCORE, pas un tableau de bord. La différence n'est pas
 * cosmétique : on ne vient pas y lire des indicateurs, on vient voir où en
 * est la journée et qui a besoin qu'on l'appelle. Donc un seul grand
 * chiffre, une barre d'objectif collective, et en dessous une carte par
 * personne avec sa progression, son état et son rang.
 *
 * Tout est calculé en base ; cet écran ne fait que mettre en scène. Les
 * compteurs animés réécrivent un nombre DÉJÀ présent dans le HTML : sans
 * JavaScript, la bonne valeur est là quand même.
 *
 * Seule la ligne « commission » est réservée à l'admin — c'est son argent.
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

  // L'objectif collectif du jour : la somme des objectifs de ceux qui sont
  // ATTENDUS. Compter toute l'équipe donnerait une barre incapable de se
  // remplir un jour où la moitié est en repos — donc inutile, et
  // démoralisante.
  const objectifEquipe = attendus.reduce((total, ligne) => {
    const membre = rows.find((row) => row.profile.id === ligne.member_id);
    return (
      total +
      (membre?.day?.goal_cards ??
        membre?.profile.daily_goal_override ??
        settings.default_daily_goal)
    );
  }, 0);

  const progression =
    objectifEquipe > 0 ? Math.min(100, (cartesVendues / objectifEquipe) * 100) : 0;

  // Les meilleurs en haut, triés par CA du jour : la liste raconte la
  // journée dès la première ligne.
  const classement = [...rows].sort(
    (a, b) => (b.day?.revenue_cents ?? 0) - (a.day?.revenue_cents ?? 0),
  );

  return (
    <div className="space-y-12 pt-2">
      {/* --- LE SCORE ------------------------------------------------------ */}
      <section className="relative">
        <div className="pointer-events-none absolute inset-x-0 -top-2 flex justify-center overflow-hidden">
          <Mot className="text-[clamp(5rem,28vw,12rem)]">{settings.team_name}</Mot>
        </div>

        <p className="surtitre relative">
          Salut {prenom} · {journeesDuJour} journée{journeesDuJour > 1 ? "s" : ""} sur{" "}
          {rows.length} membre{rows.length > 1 ? "s" : ""}
        </p>

        <p className="chiffre relative mt-5 text-[clamp(3.4rem,20vw,7rem)] text-craie">
          <Compteur valeur={caJour} format="montant" />
        </p>
        <p className="surtitre relative mt-2">Chiffre d&apos;affaires du jour</p>

        {/* La barre d'objectif collective : ce qui transforme une liste de
            chiffres en journée qu'on gagne ou qu'on rate. */}
        <div className="relative mt-7 space-y-2">
          <div className={`xp ${progression >= 100 ? "xp-pleine" : ""}`}>
            <div className="xp-remplie" style={{ width: `${Math.max(progression, 2)}%` }} />
          </div>
          <div className="flex items-baseline justify-between gap-3">
            <span className="surtitre">
              <span className="text-craie">{cartesVendues}</span> cartes sur{" "}
              {objectifEquipe} attendues
            </span>
            <span className="surtitre">{Math.round(progression)} %</span>
          </div>
        </div>
      </section>

      {/* --- LES TROIS COMPTEURS ------------------------------------------- */}
      <section className="cascade grid grid-cols-3 gap-5">
        <Indicateur
          label={estAdmin ? "Ma commission" : "Cartes vendues"}
          valeur={estAdmin ? commissionJour : cartesVendues}
          format={estAdmin ? "montant" : "nombre"}
          detail={
            estAdmin ? `${formatRate(settings.commission_rate_bp)} du CA` : "aujourd'hui"
          }
        />
        <Indicateur
          label="En tournée"
          valeur={actifs}
          detail={actifs > 0 ? "sur le terrain" : "personne dehors"}
        />
        <Indicateur
          label="Objectifs atteints"
          valeur={objectifsAtteints}
          suffixe={`/${journeesDuJour}`}
          detail={`objectif ${settings.default_daily_goal}`}
        />
      </section>

      {/* --- QUI MANQUE ---------------------------------------------------- */}
      <Link
        href="/planning"
        className="group flex items-center gap-4 border-y border-trait py-5"
      >
        <div className="min-w-0 flex-1">
          <p className="surtitre">Planning du jour</p>
          <p className="mt-2 text-[15px]">
            <span className="chiffre text-craie">{attendus.length}</span> attendu
            {attendus.length > 1 ? "s" : ""}
            {manquants.length > 0 ? (
              <>
                {" · "}
                <span className="chiffre text-peche">{manquants.length}</span> pas encore
                en route
              </>
            ) : (
              " · tout le monde est parti"
            )}
          </p>
        </div>
        <span className={manquants.length > 0 ? "pastille pastille-os" : "pastille"}>
          {manquants.length > 0 ? "À relancer" : "Complet"}
        </span>
        <IconChevron className="h-4 w-4 shrink-0 text-faint transition-transform duration-500 group-hover:translate-x-1" />
      </Link>

      {/* --- LES JOUEURS --------------------------------------------------- */}
      <Section
        titre="L'équipe aujourd'hui"
        action={
          <Link href="/equipe" className="surtitre hover:text-craie">
            Vue détaillée
          </Link>
        }
      >
        {classement.length === 0 ? (
          <Vide titre="Personne">
            Crée les comptes de ton équipe depuis la page Membres.
          </Vide>
        ) : (
          <ul className="cascade space-y-3">
            {classement.map((row, index) => (
              <li key={row.profile.id}>
                <CarteJoueur
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

      {/* --- LE STOCK ------------------------------------------------------ */}
      <Section
        titre="Stock de cartes"
        action={
          <Link href="/stock" className="surtitre hover:text-craie">
            Gérer
          </Link>
        }
      >
        <div className="cascade grid grid-cols-3 gap-5 pb-4">
          <Indicateur label="Au dépôt" valeur={stock.in_warehouse} />
          <Indicateur label="En circulation" valeur={stock.held_by_members} />
          <Indicateur label="Vendues au total" valeur={stock.sold} />
        </div>
      </Section>
    </div>
  );
}

function Indicateur({
  label,
  valeur,
  format = "nombre",
  suffixe,
  detail,
}: {
  label: string;
  valeur: number;
  format?: "nombre" | "montant";
  suffixe?: string;
  detail?: string;
}) {
  return (
    <div className="min-w-0">
      <p className="surtitre-serre">{label}</p>
      <p className="chiffre mt-1 text-[clamp(1.5rem,7vw,2.25rem)] text-craie">
        <Compteur valeur={valeur} format={format} />
        {suffixe ? <span className="text-faint">{suffixe}</span> : null}
      </p>
      {detail ? <p className="mt-1 text-sm text-faint">{detail}</p> : null}
    </div>
  );
}
