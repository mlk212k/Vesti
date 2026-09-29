import type { ReactNode } from "react"
import { Tripoint } from "@/components/marque/Tripoint"
import { cn } from "@/lib/utils/cn"

/** État vide soigné : dit ce qui manque et propose une suite, sans inventer de contenu. */
export function EtatVide({
  titre,
  children,
  actions,
  className,
}: {
  titre: string
  children?: ReactNode
  actions?: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "border-trait bg-papier-2/50 relative overflow-hidden border border-dashed px-6 py-12 sm:px-10 sm:py-16",
        className,
      )}
    >
      <Tripoint
        className="text-trait pointer-events-none absolute -right-10 -bottom-16 size-64"
        epaisseur={1}
      />
      <div className="relative max-w-xl">
        <p className="titre-carte text-2xl sm:text-[1.7rem]">{titre}</p>
        {children && (
          <div className="presse text-encre-2 mt-3 text-lg leading-snug">{children}</div>
        )}
        {actions && <div className="mt-6 flex flex-wrap gap-3">{actions}</div>}
      </div>
    </div>
  )
}
