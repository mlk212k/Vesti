"use client"

import { Loader2, Pause, Play } from "lucide-react"
import { basculerDirect } from "@/lib/radio/moteur"
import { useLecteur } from "@/lib/radio/useLecteur"
import { cn } from "@/lib/utils/cn"

/** Le CTA principal du site. Rouge : c'est le direct. */
export function BoutonDirect({
  taille = "normal",
  className,
}: {
  taille?: "compact" | "normal" | "grand"
  className?: string
}) {
  const { source, statut } = useLecteur()
  const actif = source === "direct" && statut === "playing"
  const charge = source === "direct" && statut === "loading"
  const libelle = actif ? "En écoute" : charge ? "Connexion…" : "Écouter en direct"

  return (
    <button
      type="button"
      onClick={basculerDirect}
      aria-pressed={actif}
      aria-label={actif ? "Mettre le direct en pause" : "Écouter Radio Tripoint en direct"}
      className={cn(
        "btn btn-direct",
        taille === "compact" && "min-h-10 !px-3.5 !text-[0.72rem]",
        taille === "grand" && "min-h-14 !px-6 !text-[0.9rem]",
        className,
      )}
    >
      {charge ? (
        <Loader2 className="size-4 animate-spin" aria-hidden />
      ) : actif ? (
        <Pause className="size-4 fill-current" aria-hidden />
      ) : (
        <Play className="size-4 fill-current" aria-hidden />
      )}
      {taille === "compact" ? (
        <>
          <span className="sm:hidden lg:inline xl:hidden">{actif ? "En écoute" : "Direct"}</span>
          <span className="hidden sm:inline lg:hidden xl:inline">{libelle}</span>
        </>
      ) : (
        <span>{libelle}</span>
      )}
    </button>
  )
}
