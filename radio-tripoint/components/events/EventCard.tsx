import { MapPin } from "lucide-react"
import Link from "next/link"
import { heure, jourNumero, jourSemaine, moisCourt } from "@/lib/utils/dates"
import type { Evenement } from "@/types/event"

const drapeaux = { FR: "France", LU: "Luxembourg", DE: "Allemagne" } as const

/** Carte agenda : le calendrier d'abord, comme sur une affiche de programme. */
export function EventCard({
  evenement: e,
  titreNiveau: Titre = "h3",
}: {
  evenement: Evenement
  titreNiveau?: "h2" | "h3"
}) {
  return (
    <article className="carte group border-trait grid grid-cols-[4.5rem_1fr] gap-5 border-t pt-5">
      <p className="flex flex-col items-start leading-none">
        <span className="surtitre text-encre-3">{jourSemaine(e.debut).slice(0, 3)}.</span>
        <span className="titre-affiche mt-1 text-[2.6rem] tabular-nums">{jourNumero(e.debut)}</span>
        <span className="surtitre text-accent-encre mt-1">{moisCourt(e.debut)}</span>
      </p>
      <div className="min-w-0">
        <p className="text-encre-3 flex flex-wrap items-center gap-2 text-[0.8rem]">
          <MapPin className="size-3.5" aria-hidden />
          <span className="text-encre-2 font-semibold">{e.ville}</span>
          <span aria-hidden>·</span>
          <span>{drapeaux[e.pays]}</span>
          {e.demo && <span className="badge-exemple">Exemple</span>}
        </p>
        <Titre className="carte-titre titre-carte mt-1.5 text-[1.2rem]">
          <Link href={`/agenda/${e.slug}`} className="carte-lien">
            {e.titre}
          </Link>
        </Titre>
        <p className="text-encre-2 mt-1.5 line-clamp-2 text-[0.95rem]">{e.description}</p>
        <p className="text-encre-3 mt-2 text-[0.8rem] font-semibold">
          <time dateTime={e.debut}>{heure(e.debut)}</time> · {e.lieu}
        </p>
      </div>
    </article>
  )
}
