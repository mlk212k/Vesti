import type { Metadata } from "next";
import Link from "next/link";
import { Avatar, EnTete, Section, Vide } from "@/components/ui";
import { JOURS } from "@/components/planning-editor";
import { requireRole } from "@/lib/auth";
import { urlAvatar } from "@/lib/avatar";
import { getPlanningDuJour, listCreneaux, listProfiles } from "@/lib/queries";
import { ROLE_LABEL } from "@/lib/types";
import { Relance } from "../equipe/relance";

export const metadata: Metadata = { title: "Planning" };

// La question à laquelle cette page répond, tous les matins : qui est censé
// être sur le terrain aujourd'hui, et qui n'a pas encore ouvert sa journée ?
export default async function PlanningPage() {
  await requireRole("admin", "manager");

  const [planning, creneaux, profiles] = await Promise.all([
    getPlanningDuJour(),
    listCreneaux(),
    listProfiles({ activeOnly: true }),
  ]);

  const attendus = planning.filter((p) => p.attendu);
  const manquants = attendus.filter((p) => !p.journee_ouverte);
  const jourCourant = planning[0]?.weekday ?? 1;

  return (
    <div className="space-y-6">
      <EnTete surtitre="Qui bosse quand" titre="Planning" />

      <Section titre={`Attendus aujourd'hui · ${attendus.length}`}>
        {attendus.length === 0 ? (
          <Vide titre="Personne n'est prévu aujourd'hui">
            Les créneaux se règlent depuis le profil de chacun.
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
                      className="truncate font-medium hover:text-peche"
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
        <p className="panneau-creux px-4 py-3 text-sm text-peche">
          {manquants.length} personne{manquants.length > 1 ? "s" : ""} attendue
          {manquants.length > 1 ? "s" : ""} n&apos;{manquants.length > 1 ? "ont" : "a"}{" "}
          pas encore ouvert sa journée.
        </p>
      ) : null}

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
                      jour.num === jourCourant ? "text-peche" : "text-faint"
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
                  <td className="max-w-[9rem] truncate px-3 py-2.5 text-sm">
                    {profile.full_name}
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
                            className={`h-4 w-2 rounded-[1px] ${matin ? "bg-peche" : "bg-[rgba(255,255,255,0.07)]"}`}
                            title={`${jour.court} matin`}
                          />
                          <span
                            className={`h-4 w-2 rounded-[1px] ${aprem ? "bg-peche" : "bg-[rgba(255,255,255,0.07)]"}`}
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
