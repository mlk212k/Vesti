import type { Metadata } from "next";
import Link from "next/link";
import { Avatar, EnTete, Section, Vide } from "@/components/ui";
import { PlanningEditor } from "@/components/planning-editor";
import { JOURS } from "@/lib/planning";
import { requireRole } from "@/lib/auth";
import { urlAvatar } from "@/lib/avatar";
import { getPlanningDuJour, listCreneaux, listProfiles } from "@/lib/queries";
import { ROLE_LABEL } from "@/lib/types";
import { Relance } from "../equipe/relance";

export const metadata: Metadata = { title: "Planning" };

/**
 * La page Planning.
 *
 * Elle répond à la question de tous les matins — qui est censé être sur le
 * terrain aujourd'hui, et qui n'a pas encore ouvert sa journée — et, depuis
 * cette version, elle permet aussi d'Y RÉGLER les créneaux de n'importe qui.
 *
 * Jusqu'ici chacun ne pouvait modifier que les siens, depuis son profil. La
 * base l'autorisait pourtant déjà (la policy `availabilities_insert` accepte
 * `public.is_staff()`), mais aucun écran ne l'exposait : le chef voyait le
 * planning de son équipe sans pouvoir le corriger. Le membre à régler passe
 * par l'URL (`?membre=`), ce qui rend le lien partageable et la page
 * rechargeable sans perdre la sélection.
 */
export default async function PlanningPage({
  searchParams,
}: {
  searchParams: Promise<{ membre?: string }>;
}) {
  await requireRole("admin", "manager");
  const params = await searchParams;

  const [planning, creneaux, profiles] = await Promise.all([
    getPlanningDuJour(),
    listCreneaux(),
    listProfiles({ activeOnly: true }),
  ]);

  const attendus = planning.filter((p) => p.attendu);
  const manquants = attendus.filter((p) => !p.journee_ouverte);
  const jourCourant = planning[0]?.weekday ?? 1;

  // Le membre dont on règle les créneaux. On le cherche dans la liste plutôt
  // que de faire confiance au paramètre : un identifiant inconnu ne doit pas
  // produire un formulaire qui écrirait dans le vide.
  const cible = profiles.find((profile) => profile.id === params.membre) ?? null;

  return (
    <div className="space-y-6">
      <EnTete surtitre="Qui bosse quand" titre="Planning" />

      <Section titre={`Attendus aujourd'hui · ${attendus.length}`}>
        {attendus.length === 0 ? (
          <Vide titre="Personne n'est prévu aujourd'hui">
            Personne n&apos;a déclaré ce jour-là. Les créneaux se règlent plus
            bas, ou depuis le profil de chacun.
          </Vide>
        ) : (
          <ul className="space-y-2">
            {attendus.map((ligne) => (
              <li key={ligne.member_id} className="panneau p-4">
                <div className="flex items-center gap-3">
                  <Avatar
                    nom={ligne.full_name}
                    url={urlAvatar(ligne.avatar_url)}
                  />
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/equipe/${ligne.member_id}`}
                      className="truncate font-medium hover:text-os"
                    >
                      {ligne.full_name}
                    </Link>
                    <p className="text-sm text-faint">
                      {ROLE_LABEL[ligne.role]} ·{" "}
                      {[ligne.matin ? "matin" : null, ligne.apres_midi ? "après-midi" : null]
                        .filter(Boolean)
                        .join(" + ")}
                    </p>
                  </div>
                  <span
                    className={
                      ligne.journee_ouverte
                        ? "pastille pastille-vive"
                        : "pastille pastille-vive"
                    }
                  >
                    {ligne.journee_ouverte ? "En route" : "Pas ouvert"}
                  </span>
                </div>

                {/* La relance ne s'affiche que là où elle a du sens : une
                    personne attendue qui n'a pas ouvert sa journée. */}
                {!ligne.journee_ouverte ? (
                  <div className="mt-3">
                    <Relance memberId={ligne.member_id} nom={ligne.full_name} />
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </Section>

      {manquants.length > 0 ? (
        <p className="panneau-creux px-4 py-3 text-sm text-os">
          {manquants.length} personne{manquants.length > 1 ? "s" : ""} attendue
          {manquants.length > 1 ? "s" : ""} n&apos;{manquants.length > 1 ? "ont" : "a"}{" "}
          pas encore ouvert sa journée.
        </p>
      ) : null}

      {/* Régler les créneaux de quelqu'un. La cible vient de l'URL, donc
          l'ouverture d'un membre est un simple lien — et la RLS reste seule
          juge : un commercial qui forgerait ce paramètre se ferait refuser
          l'écriture par la base. */}
      <Section titre="Régler les disponibilités">
        <div className="flex flex-wrap gap-2">
          {profiles.map((profile) => {
            const actif = params.membre === profile.id;
            return (
              <Link
                key={profile.id}
                href={actif ? "/planning" : `/planning?membre=${profile.id}`}
                className={`btn ${actif ? "btn-primaire" : "btn-fantome"}`}
              >
                {profile.full_name}
              </Link>
            );
          })}
        </div>

        {cible ? (
          <PlanningEditor
            key={cible.id}
            memberId={cible.id}
            titre={`Disponibilités de ${cible.full_name}`}
            creneaux={creneaux
              .filter((c) => c.member_id === cible.id)
              .map((c) => ({ weekday: c.weekday, slot: c.slot }))}
          />
        ) : (
          <p className="text-sm text-faint">
            Choisis quelqu&apos;un pour modifier ses créneaux. Chacun peut
            aussi régler les siens depuis son profil.
          </p>
        )}
      </Section>

      <Section titre="La semaine">
        <div className="panneau overflow-x-auto">
          <table className="w-full min-w-[420px] border-collapse">
            <thead>
              <tr className="border-b border-trait">
                <th className="px-3 py-2.5 text-left text-sm text-faint">
                  Membre
                </th>
                {JOURS.map((jour) => (
                  <th
                    key={jour.num}
                    className={`px-2 py-2.5 text-center  text-sm   ${
                      jour.num === jourCourant ? "text-os" : "text-faint"
                    }`}
                  >
                    {jour.court}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {profiles.map((profile) => (
                <tr key={profile.id} className="border-b border-trait last:border-b-0">
                  {/* Le nom est un lien vers l'édition de CE membre : sans
                      ça, il faudrait deviner que les boutons du dessus
                      servent à corriger la ligne qu'on est en train de
                      lire. */}
                  <td className="max-w-[9rem] px-3 py-2.5 text-sm">
                    <Link
                      href={`/planning?membre=${profile.id}`}
                      className="block truncate hover:text-os"
                    >
                      {profile.full_name}
                    </Link>
                  </td>
                  {JOURS.map((jour) => {
                    const duJour = creneaux.filter(
                      (c) => c.member_id === profile.id && c.weekday === jour.num,
                    );
                    const matin = duJour.some((c) => c.slot === "am");
                    const aprem = duJour.some((c) => c.slot === "pm");
                    return (
                      <td key={jour.num} className="px-2 py-2.5">
                        <div className="flex justify-center gap-[3px]">
                          <span
                            className={`h-4 w-2 rounded-[1px] ${matin ? "bg-os" : "bg-[rgba(255,255,255,0.07)]"}`}
                            title={`${jour.court} matin`}
                          />
                          <span
                            className={`h-4 w-2 rounded-[1px] ${aprem ? "bg-os" : "bg-[rgba(255,255,255,0.07)]"}`}
                            title={`${jour.court} après-midi`}
                          />
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-sm text-faint">
          Deux barres par jour : matin et après-midi.
        </p>
      </Section>
    </div>
  );
}
