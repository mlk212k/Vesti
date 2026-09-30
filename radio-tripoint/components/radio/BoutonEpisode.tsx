"use client"

import { Loader2, Pause, Play } from "lucide-react"
import { basculer, ecouterEpisode, type EpisodeEnLecture } from "@/lib/radio/moteur"
import { useLecteur } from "@/lib/radio/useLecteur"
import { cn } from "@/lib/utils/cn"

export function BoutonEpisode({
  episode,
  variante = "texte",
  className,
}: {
  episode: EpisodeEnLecture
  variante?: "texte" | "rond" | "grand"
  className?: string
}) {
  const l = useLecteur()
  const courant = l.source === "episode" && l.episode?.slug === episode.slug
  const joue = courant && l.statut === "playing"
  const charge = courant && l.statut === "loading"
  const agir = () => (courant && (joue || charge) ? basculer() : void ecouterEpisode(episode))
  const label = `${joue ? "Mettre en pause" : "Écouter"} : ${episode.titre}`
  const Icone = charge ? Loader2 : joue ? Pause : Play

  if (variante === "rond") {
    return (
      <button
        type="button"
        onClick={agir}
        aria-label={label}
        aria-pressed={joue}
        className={cn(
          "bg-encre text-papier hover:bg-accent hover:text-sur-accent relative z-10 grid size-12 flex-none place-items-center rounded-full transition-colors",
          className,
        )}
      >
        <Icone
          className={cn(
            "size-5",
            charge ? "animate-spin" : "fill-current",
            !joue && !charge && "translate-x-px",
          )}
          aria-hidden
        />
      </button>
    )
  }
  return (
    <button
      type="button"
      onClick={agir}
      aria-label={label}
      aria-pressed={joue}
      className={cn(
        "btn relative z-10",
        variante === "grand" ? "btn-plein min-h-12 !px-6" : "btn-trait",
        className,
      )}
    >
      <Icone className={cn("size-4", charge ? "animate-spin" : "fill-current")} aria-hidden />
      {joue ? "Pause" : courant && l.statut === "paused" ? "Reprendre" : "Écouter"}
    </button>
  )
}
