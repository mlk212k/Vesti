"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Alerte } from "@/components/alerte";
import { Submit } from "@/components/submit";
import type { ActionResult } from "@/lib/errors";
import { jouer } from "@/lib/sfx";
import { updateAvailabilityAction } from "@/app/(app)/profil/actions";

export const JOURS = [
  { num: 1, court: "LUN" },
  { num: 2, court: "MAR" },
  { num: 3, court: "MER" },
  { num: 4, court: "JEU" },
  { num: 5, court: "VEN" },
  { num: 6, court: "SAM" },
  { num: 7, court: "DIM" },
] as const;

export type Creneau = { weekday: number; slot: "am" | "pm" };

// Grille 7 jours × 2 créneaux. Des cases à cocher, pas un composant maison :
// elles se cochent au clavier, s'annoncent correctement aux lecteurs d'écran
// et fonctionnent même si le JavaScript n'a pas fini de charger.
export function PlanningEditor({
  creneaux,
  memberId,
  titre = "Mes disponibilités",
}: {
  creneaux: Creneau[];
  memberId?: string;
  titre?: string;
}) {
  const router = useRouter();
  const [state, action] = useActionState<ActionResult | undefined, FormData>(
    async (precedent: ActionResult | undefined, donnees: FormData) => {
      const resultat = await updateAvailabilityAction(precedent, donnees);
      jouer(resultat.ok ? "tampon" : "erreur");
      return resultat;
    },
    undefined,
  );

  useEffect(() => {
    if (state?.ok) router.refresh();
  }, [state, router]);

  const coche = (jour: number, slot: "am" | "pm") =>
    creneaux.some((c) => c.weekday === jour && c.slot === slot);

  return (
    <form action={action} className="panneau space-y-4 p-5">
      {memberId ? <input type="hidden" name="member_id" value={memberId} /> : null}

      <div>
        <h2 className="titre text-xl">{titre}</h2>
        <p className="mt-1 text-sm text-faint">
          Sert à savoir qui est attendu sur le terrain. Quelqu&apos;un qui
          n&apos;a pas ouvert sa journée un jour où il n&apos;est pas dispo
          n&apos;est pas en retard — c&apos;est toute la différence.
        </p>
      </div>

      <div className="overflow-hidden rounded-[6px] border border-trait">
        <div className="grid grid-cols-[auto_1fr_1fr] items-center border-b border-trait bg-velours">
          <span className="px-3 py-2 text-sm text-faint">
            Jour
          </span>
          <span className="px-3 py-2 text-center text-sm text-faint">
            Matin
          </span>
          <span className="px-3 py-2 text-center text-sm text-faint">
            Après-midi
          </span>
        </div>

        {JOURS.map((jour) => (
          <div
            key={jour.num}
            className="grid grid-cols-[auto_1fr_1fr] items-center border-b border-trait last:border-b-0"
          >
            <span className="w-14 px-3 py-2.5 text-sm">
              {jour.court}
            </span>
            {(["am", "pm"] as const).map((slot) => (
              <label
                key={slot}
                className="flex cursor-pointer items-center justify-center py-2.5"
              >
                <input
                  type="checkbox"
                  name={`c-${jour.num}-${slot}`}
                  defaultChecked={coche(jour.num, slot)}
                  onChange={() => jouer("tick")}
                  className="h-5 w-5 accent-[var(--braise)]"
                  aria-label={`${jour.court} ${slot === "am" ? "matin" : "après-midi"}`}
                />
              </label>
            ))}
          </div>
        ))}
      </div>

      {state?.ok ? <Alerte ton="succes">Planning enregistré.</Alerte> : null}
      {state && !state.ok ? <Alerte>{state.error}</Alerte> : null}

      <Submit className="btn btn-primaire w-full py-3" pendingLabel="…">
        Enregistrer le planning
      </Submit>
    </form>
  );
}
