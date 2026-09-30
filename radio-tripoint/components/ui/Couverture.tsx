import { Tripoint } from "@/components/marque/Tripoint"
import { cn } from "@/lib/utils/cn"

export type Teinte = "encre" | "accent" | "sable" | "nuit"

/**
 * Affiche typographique, à la place d'une photo absente. Le mot affiché
 * est tiré du contenu (rubrique, émission) : jamais un « placeholder ».
 */
export function Couverture({
  mot,
  surmot,
  teinte = "encre",
  className,
  taille = "normal",
}: {
  mot: string
  surmot?: string
  teinte?: Teinte
  className?: string
  taille?: "petit" | "normal" | "grand"
}) {
  if (taille === "petit") {
    // Trop petit pour un mot entier : un monogramme, comme un indicatif d'antenne.
    const mono = mot
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .split(/\s+/)
      .filter((m) => m.length > 2 || /^\p{Lu}/u.test(m))
      .slice(0, 2)
      .map((m) => m[0].toUpperCase())
      .join("")
    return (
      <div
        data-teinte={teinte}
        data-couverture="generee"
        className={cn(
          "couverture relative grid h-full w-full place-items-center overflow-hidden",
          className,
        )}
        aria-hidden
      >
        <Tripoint
          className="absolute inset-0 h-full w-full text-[color:var(--c-trait)]"
          epaisseur={1}
          point={false}
        />
        <span className="titre-affiche relative text-[1.6rem] tracking-[-0.04em]">
          {mono || "RT"}
        </span>
      </div>
    )
  }
  return (
    <div
      data-teinte={teinte}
      data-couverture="generee"
      className={cn("couverture relative h-full w-full overflow-hidden", className)}
      aria-hidden
    >
      <Tripoint
        className="absolute top-1/2 left-[62%] h-[190%] w-auto -translate-x-1/2 -translate-y-1/2 text-[color:var(--c-trait)]"
        epaisseur={1.25}
      />
      {surmot && <span className="surtitre absolute top-4 left-4 opacity-80">{surmot}</span>}
      <span
        className={cn(
          "titre-affiche absolute right-4 bottom-3 left-4 line-clamp-2 break-words",
          taille === "normal" && "text-[clamp(1.6rem,1rem+2.4vw,2.6rem)]",
          taille === "grand" && "bottom-5 left-6 text-[clamp(2.4rem,1rem+5vw,5rem)]",
        )}
      >
        {mot}
      </span>
    </div>
  )
}
