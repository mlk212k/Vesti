import { ArrowUpRight, Clock } from "lucide-react"
import Link from "next/link"
import { libelleCreneaux } from "@/lib/radio/grille"
import type { Emission } from "@/types/show"
import { Visuel } from "@/components/ui/Visuel"

/** Carte émission : format affiche (portrait), l'émission comme une pochette. */
export function ShowCard({
  emission,
  titreNiveau: Titre = "h3",
}: {
  emission: Emission
  titreNiveau?: "h2" | "h3"
}) {
  const horaires = libelleCreneaux(emission.creneaux)
  return (
    <article className="carte group border-trait bg-surface flex h-full flex-col border">
      <Visuel
        visuel={emission.visuel}
        repli={{ mot: emission.nom, surmot: "Radio Tripoint", teinte: emission.teinte }}
        ratio="aspect-[4/3]"
        sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 85vw"
      />
      <div className="flex flex-1 flex-col p-5">
        <p className="badge">{emission.thematique}</p>
        <Titre className="carte-titre titre-carte mt-2 text-[1.35rem]">
          <Link href={`/emissions/${emission.slug}`} className="carte-lien">
            {emission.nom}
          </Link>
        </Titre>
        <p className="presse text-encre-2 mt-2 text-[1.05rem] leading-snug">
          {emission.accroche ?? "Présentation à venir."}
        </p>
        <div className="mt-auto flex items-end justify-between gap-4 pt-5">
          <p className="text-encre-3 flex items-start gap-2 text-[0.82rem]">
            <Clock className="mt-0.5 size-3.5 flex-none" aria-hidden />
            <span>{horaires.length ? horaires[0] : "Horaires à venir"}</span>
          </p>
          <span className="text-encre group-hover:text-accent-encre inline-flex flex-none items-center gap-1 text-[0.82rem] font-bold">
            Découvrir <ArrowUpRight className="size-4" aria-hidden />
          </span>
        </div>
      </div>
    </article>
  )
}
