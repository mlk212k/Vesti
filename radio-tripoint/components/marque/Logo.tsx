import Image from "next/image"
import { site } from "@/config/site"
import { cn } from "@/lib/utils/cn"

/**
 * Logo officiel (config/site.ts → visuels.logo). Rond : il se pose comme un
 * autocollant. Sans fichier, le nom est composé en toutes lettres — ce
 * n'est pas un autre logo, c'est son absence traitée proprement.
 */
export function Logo({
  className,
  sombre = false,
  taille = 56,
  preload = false,
}: {
  className?: string
  sombre?: boolean
  /** Diamètre de référence (px) pour le choix de la résolution. */
  taille?: number
  preload?: boolean
}) {
  const src = sombre ? (site.visuels.logoSombre ?? site.visuels.logo) : site.visuels.logo
  if (src) {
    return (
      <Image
        src={src}
        alt={`${site.nomOfficiel} — ${site.baseline}`}
        width={taille}
        height={taille}
        sizes={`${taille}px`}
        preload={preload}
        className={cn("aspect-square rounded-full", className)}
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
