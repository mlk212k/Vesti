import { ArrowRight } from "lucide-react"
import Link from "next/link"
import type { ReactNode } from "react"
import { cn } from "@/lib/utils/cn"

/** Ouverture de section façon presse : filet épais, surtitre, titre, lien. */
export function EnTeteSection({
  surtitre,
  titre,
  id,
  lien,
  intro,
  className,
  sombre,
}: {
  surtitre?: string
  titre: ReactNode
  id: string
  lien?: { href: string; libelle: string }
  intro?: ReactNode
  className?: string
  sombre?: boolean
}) {
  return (
    <div
      className={cn(
        "border-t-2 pt-4",
        sombre ? "border-nuit-encre" : "border-trait-fort",
        className,
      )}
    >
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
        <div className="min-w-0">
          {surtitre && (
            <p className={cn("surtitre", sombre ? "text-nuit-accent" : "text-accent-encre")}>
              {surtitre}
            </p>
          )}
          <h2 id={id} className={cn("titre-section mt-2", sombre && "text-nuit-encre")}>
            {titre}
          </h2>
        </div>
        {lien && (
          <Link
            href={lien.href}
            className={cn(
              "lien-fleche mb-1",
              sombre ? "text-nuit-encre hover:text-nuit-accent" : "hover:text-accent-encre",
            )}
          >
            {lien.libelle} <ArrowRight className="size-4" aria-hidden />
          </Link>
        )}
      </div>
      {intro && (
        <div
          className={cn(
            "presse mt-4 max-w-2xl text-lg leading-snug",
            sombre ? "text-nuit-encre-2" : "text-encre-2",
          )}
        >
          {intro}
        </div>
      )}
    </div>
  )
}
