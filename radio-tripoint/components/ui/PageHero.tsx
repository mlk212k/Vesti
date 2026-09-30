import type { ReactNode } from "react"
import { Breadcrumbs, type Miette } from "./Breadcrumbs"
import { cn } from "@/lib/utils/cn"

/** En-tête de page intérieure : fil d'Ariane, surtitre, grand titre, chapeau. */
export function PageHero({
  miettes,
  surtitre,
  titre,
  intro,
  enfants,
  sombre = false,
  className,
}: {
  miettes: Miette[]
  surtitre?: string
  titre: ReactNode
  intro?: ReactNode
  enfants?: ReactNode
  sombre?: boolean
  className?: string
}) {
  return (
    <header
      className={cn(sombre ? "bg-nuit text-nuit-encre" : "border-trait-fort border-b-2", className)}
    >
      <div className="conteneur pt-6 pb-10 sm:pt-8 lg:pb-14">
        <Breadcrumbs elements={miettes} sombre={sombre} />
        {surtitre && (
          <p
            className={cn(
              "surtitre mt-8 sm:mt-10",
              sombre ? "text-nuit-accent" : "text-accent-encre",
            )}
          >
            {surtitre}
          </p>
        )}
        <h1 className={cn("titre-page", surtitre ? "mt-3" : "mt-8 sm:mt-10")}>{titre}</h1>
        {intro && (
          <div
            className={cn(
              "presse mt-5 max-w-2xl text-[1.2rem] leading-snug sm:text-[1.3rem]",
              sombre ? "text-nuit-encre-2" : "text-encre-2",
            )}
          >
            {intro}
          </div>
        )}
        {enfants}
      </div>
    </header>
  )
}
