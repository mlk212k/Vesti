import Link from "next/link"
import { BoutonEpisode } from "@/components/radio/BoutonEpisode"
import { Visuel } from "@/components/ui/Visuel"
import { dateLongue, duree } from "@/lib/utils/dates"
import type { Episode } from "@/types/podcast"

/** Ligne d'épisode : pochette, titre, émission, date, durée, lecture immédiate. */
export function PodcastCard({
  episode,
  emissionNom,
  titreNiveau: Titre = "h3",
}: {
  episode: Episode
  emissionNom?: string
  titreNiveau?: "h2" | "h3"
}) {
  return (
    <article className="carte group grid grid-cols-[4.5rem_1fr_auto] items-center gap-4 py-4 sm:grid-cols-[6rem_1fr_auto] sm:gap-5">
      <Visuel
        visuel={episode.visuel}
        repli={{
          mot: emissionNom ?? "Replay",
          teinte: episode.emission ? "nuit" : "encre",
          taille: "petit",
        }}
        ratio="aspect-square"
        sizes="96px"
      />
      <div className="min-w-0">
        <p className="flex flex-wrap items-center gap-2">
          <span className="badge">{emissionNom ?? "Podcast"}</span>
          {episode.demo && <span className="badge-exemple">Exemple</span>}
        </p>
        <Titre className="carte-titre titre-carte mt-1 line-clamp-2 text-[1.05rem] sm:text-[1.15rem]">
          <Link href={`/podcasts/${episode.slug}`} className="carte-lien">
            {episode.titre}
          </Link>
        </Titre>
        <p className="text-encre-3 mt-1 text-[0.8rem]">
          <time dateTime={episode.publieLe}>{dateLongue(episode.publieLe)}</time> ·{" "}
          {duree(episode.duree)}
        </p>
      </div>
      <BoutonEpisode
        variante="rond"
        episode={{
          slug: episode.slug,
          titre: episode.titre,
          audioUrl: episode.audioUrl,
          sousTitre: emissionNom,
          duree: episode.duree,
        }}
      />
    </article>
  )
}
