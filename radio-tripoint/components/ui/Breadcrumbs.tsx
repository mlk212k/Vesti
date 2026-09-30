import { ChevronRight } from "lucide-react"
import Link from "next/link"
import { jsonLdFilAriane } from "@/lib/seo/jsonld"
import { cn } from "@/lib/utils/cn"
import { JsonLd } from "./JsonLd"

export interface Miette {
  nom: string
  chemin: string
}

/** Fil d'Ariane visible + BreadcrumbList JSON-LD. Le dernier élément est la page courante. */
export function Breadcrumbs({
  elements,
  className,
  sombre,
}: {
  elements: Miette[]
  className?: string
  sombre?: boolean
}) {
  const complet = [{ nom: "Accueil", chemin: "/" }, ...elements]
  return (
    <>
      <nav
        aria-label="Fil d'Ariane"
        className={cn("text-[0.8rem]", sombre ? "text-nuit-encre-2" : "text-encre-3", className)}
      >
        <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
          {complet.map((m, i) => {
            const dernier = i === complet.length - 1
            return (
              <li key={m.chemin} className="flex min-w-0 items-center gap-1.5">
                {dernier ? (
                  <span
                    aria-current="page"
                    className={cn(
                      "line-clamp-1 font-medium",
                      sombre ? "text-nuit-encre" : "text-encre-2",
                    )}
                  >
                    {m.nom}
                  </span>
                ) : (
                  <>
                    <Link
                      href={m.chemin}
                      className={cn(
                        "hover:underline",
                        sombre ? "hover:text-nuit-encre" : "hover:text-encre",
                      )}
                    >
                      {m.nom}
                    </Link>
                    <ChevronRight className="size-3.5 flex-none opacity-60" aria-hidden />
                  </>
                )}
              </li>
            )
          })}
        </ol>
      </nav>
      <JsonLd data={jsonLdFilAriane(complet)} />
    </>
  )
}
