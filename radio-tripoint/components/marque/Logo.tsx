import Image from "next/image"
import { site } from "@/config/site"
import { cn } from "@/lib/utils/cn"

/**
 * Logo officiel si le fichier est fourni (config/site.ts → visuels.logo),
 * sinon le nom de la radio composé en toutes lettres. Ce n'est pas un
 * nouveau logo : c'est l'absence du logo, traitée proprement.
 */
export function Logo({ className, sombre = false }: { className?: string; sombre?: boolean }) {
  const src = sombre ? (site.visuels.logoSombre ?? site.visuels.logo) : site.visuels.logo
  if (src) {
    return (
      <Image
        src={src}
        alt={site.nomOfficiel}
        width={180}
        height={48}
        className={cn("h-9 w-auto sm:h-10", className)}
        preload
      />
    )
  }
  return (
    <span className={cn("inline-flex flex-col leading-none", className)}>
      <span className="surtitre !text-[0.62rem] !tracking-[0.32em] opacity-70">Radio</span>
      <span
        className="font-titre text-[1.35rem] font-extrabold tracking-[-0.03em] sm:text-[1.5rem]"
        style={{ fontVariationSettings: '"wdth" 118' }}
      >
        TRIPOINT
      </span>
    </span>
  )
}
