import type { Metadata } from "next";
import Link from "next/link";
import { CarteJoueur } from "@/components/carte-joueur";
import { Compteur } from "@/components/compteur";
import { EnTete, Vide } from "@/components/ui";
import { getSettings, isAdmin, requireRole } from "@/lib/auth";
import { getMemberTotals, getTeamToday } from "@/lib/queries";

export const metadata: Metadata = { title: "Équipe" };

/**
 * La page Équipe : la vue de supervision de Malik, et celle de l'admin avec
 * les raccourcis de gestion en plus.
 *
 * Elle reprend exactement la carte joueur de l'accueil — même mise en scène,
 * mêmes couleurs, même diode — avec en plus le CUMUL depuis le début. C'est
 * ce qui la distingue du tableau de score : l'accueil répond « où en est la
 * journée », celle-ci répond « qui porte l'équipe depuis le départ ».
 */
export default async function TeamPage() {
  const viewer = await requireRole("admin", "manager");
  const [rows, totals, settings] = await Promise.all([
    getTeamToday(),
    getMemberTotals(),
    getSettings(),
  ]);

  const parMembre = new Map(totals.map((t) => [t.member_id, t]));

  // Classement sur le CUMUL, pas sur la journée : sur cette page on regarde
  // la durée, pas l'instant. L'accueil, lui, trie par CA du jour.
  const classement = [...rows].sort(
    (a, b) =>
      (parMembre.get(b.profile.id)?.revenue_cents ?? 0) -
      (parMembre.get(a.profile.id)?.revenue_cents ?? 0),
  );

  const caTotal = totals.reduce((t, m) => t + m.revenue_cents, 0);
  const cartesTotal = totals.reduce((t, m) => t + m.cards_sold, 0);
  const commissionTotal = totals.reduce((t, m) => t + m.commission_cents, 0);

  return (
    <div className="space-y-10">
      <EnTete surtitre={settings.team_name} titre="Équipe">
        {isAdmin(viewer.role) ? (
          <Link href="/membres" className="btn btn-fantome">
            Gérer les comptes
          </Link>
        ) : null}
      </EnTete>

      {/* Le cumul de l'équipe, depuis toujours. */}
      <section className="cascade grid grid-cols-3 gap-5">
        <div className="min-w-0">
          <p className="surtitre-serre">Chiffre d&apos;affaires</p>
          <p className="chiffre mt-1 text-[clamp(1.5rem,7vw,2.25rem)] text-craie">
            <Compteur valeur={caTotal} format="montant" />
          </p>
          <p className="mt-1 text-sm text-faint">depuis le début</p>
        </div>
        <div className="min-w-0">
          <p className="surtitre-serre">Cartes vendues</p>
          <p className="chiffre mt-1 text-[clamp(1.5rem,7vw,2.25rem)] text-craie">
            <Compteur valeur={cartesTotal} />
          </p>
          <p className="mt-1 text-sm text-faint">toutes journées</p>
        </div>
        <div className="min-w-0">
          <p className="surtitre-serre">
            {isAdmin(viewer.role) ? "Ma commission" : "Commission"}
          </p>
          <p className="chiffre mt-1 text-[clamp(1.5rem,7vw,2.25rem)] text-craie">
            <Compteur valeur={commissionTotal} format="montant" />
          </p>
          <p className="mt-1 text-sm text-faint">cumulée</p>
        </div>
      </section>

      {classement.length === 0 ? (
        <Vide titre="Aucun membre actif">
          Les comptes se créent depuis la page Membres.
        </Vide>
      ) : (
        <ul className="cascade space-y-3 pb-4">
          {classement.map((row, index) => (
            <li key={row.profile.id}>
              <CarteJoueur
                row={row}
                estAdmin={isAdmin(viewer.role)}
                objectifParDefaut={settings.default_daily_goal}
                rang={
                  (parMembre.get(row.profile.id)?.revenue_cents ?? 0) > 0
                    ? index + 1
                    : null
                }
                totals={parMembre.get(row.profile.id)}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
