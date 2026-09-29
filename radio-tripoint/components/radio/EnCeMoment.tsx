"use client"

import { ArrowRight } from "lucide-react"
import Link from "next/link"
import { radioConfig } from "@/config/radioConfig"
import { libelleHeure, programmeEnCours, programmeSuivant } from "@/lib/radio/grille"
import { useMaintenant } from "@/lib/radio/horloge"
import type { GrilleClient } from "@/lib/radio/types"
import { useLecteur, useSuiviTitre } from "@/lib/radio/useLecteur"

/**
 * « En ce moment sur Radio Tripoint ». Branché sur la grille des émissions :
 * dès que des créneaux sont renseignés dans data/shows.ts, l'émission à
 * l'antenne et la suivante s'affichent. Sinon, le module reste juste —
 * il ne prétend pas savoir ce qui passe.
 */
export function EnCeMoment({ grille }: { grille: GrilleClient }) {
  const maintenant = useMaintenant()
  const l = useLecteur()
  useSuiviTitre()
  const date = maintenant ? new Date(maintenant) : null
  const actuel = date ? programmeEnCours(grille, date, radioConfig.timeZone) : null
  const suivant = date ? programmeSuivant(grille, date, radioConfig.timeZone) : null
  const joue = l.source === "direct" && l.statut === "playing"

  return (
    <section
      aria-labelledby="en-ce-moment"
      className="border-nuit-trait bg-nuit-2/80 relative border p-5 backdrop-blur sm:p-6"
    >
      <div className="flex items-center justify-between gap-4">
        <h2 id="en-ce-moment" className="surtitre text-nuit-encre-2 flex items-center gap-2.5">
          <span className="point-direct" data-actif={joue} />
          En ce moment sur Radio Tripoint
        </h2>
        {actuel && (
          <span className="surtitre text-nuit-encre-2 tabular-nums">
            {libelleHeure(actuel.creneau.debut)} — {libelleHeure(actuel.creneau.fin)}
          </span>
        )}
      </div>

      <div className="mt-5 min-h-[4.5rem]">
        {actuel ? (
          <>
            <p className="surtitre text-nuit-accent">{actuel.emission.thematique}</p>
            <p className="titre-affiche text-nuit-encre mt-1.5 text-[clamp(1.7rem,1.2rem+2vw,2.4rem)]">
              <Link
                href={`/emissions/${actuel.emission.slug}`}
                className="hover:underline hover:decoration-2 hover:underline-offset-4"
              >
                {actuel.emission.nom}
              </Link>
            </p>
          </>
        ) : (
          <>
            <p className="surtitre text-nuit-accent">À l&apos;antenne</p>
            <p className="titre-affiche text-nuit-encre mt-1.5 text-[clamp(1.7rem,1.2rem+2vw,2.4rem)]">
              {radioConfig.radioName}
            </p>
          </>
        )}
        {l.titreEnCours && (
          <p className="text-nuit-encre-2 mt-2 truncate text-sm">
            <span className="sr-only">Titre en cours : </span>
            {[l.titreEnCours.artiste, l.titreEnCours.titre].filter(Boolean).join(" — ")}
          </p>
        )}
      </div>

      <div className="border-nuit-trait mt-6 flex flex-wrap items-center justify-between gap-4 border-t pt-5">
        {suivant && suivant.emission.slug !== actuel?.emission.slug ? (
          <p className="text-nuit-encre-2 text-sm">
            Ensuite · <span className="text-nuit-encre font-semibold">{suivant.emission.nom}</span>{" "}
            <span className="tabular-nums">à {libelleHeure(suivant.creneau.debut)}</span>
          </p>
        ) : (
          <Link href="/emissions" className="lien-fleche text-nuit-encre-2 hover:text-nuit-encre">
            Toutes les émissions <ArrowRight className="size-4" aria-hidden />
          </Link>
        )}
      </div>
    </section>
  )
}
