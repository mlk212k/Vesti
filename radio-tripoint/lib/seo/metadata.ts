import type { Metadata } from "next"
import { site } from "@/config/site"

interface Options {
  titre: string
  description: string
  chemin: string
  /** Titre sans le suffixe « | Radio Tripoint ». */
  absolu?: boolean
  image?: { src: string; alt: string; largeur?: number; hauteur?: number }
  type?: "website" | "article"
  publieLe?: string
  modifieLe?: string
  section?: string
  motsCles?: string[]
  noindex?: boolean
}

export const urlAbsolue = (chemin: string) =>
  `${site.url}${chemin.startsWith("/") ? chemin : `/${chemin}`}`

/** Metadata complète d'une page : canonical, Open Graph, carte X. */
export function metadataPage(o: Options): Metadata {
  const images = o.image
    ? [{ url: o.image.src, alt: o.image.alt, width: o.image.largeur, height: o.image.hauteur }]
    : undefined
  return {
    title: o.absolu ? { absolute: o.titre } : o.titre,
    description: o.description,
    keywords: o.motsCles,
    alternates: { canonical: o.chemin },
    openGraph: {
      type: o.type ?? "website",
      locale: "fr_FR",
      siteName: site.nomOfficiel,
      url: o.chemin,
      title: o.titre,
      description: o.description,
      ...(images ? { images } : {}),
      ...(o.type === "article"
        ? { publishedTime: o.publieLe, modifiedTime: o.modifieLe ?? o.publieLe, section: o.section }
        : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: o.titre,
      description: o.description,
      ...(images ? { images: images.map((i) => i.url) } : {}),
    },
    ...(o.noindex ? { robots: { index: false, follow: true } } : {}),
  }
}
