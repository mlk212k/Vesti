export interface LienNav {
  libelle: string
  href: string
}

/** Navigation principale (desktop). */
export const navPrincipale: LienNav[] = [
  { libelle: "Actualités", href: "/actualites" },
  { libelle: "Émissions", href: "/emissions" },
  { libelle: "Podcasts", href: "/podcasts" },
  { libelle: "Agenda", href: "/agenda" },
  { libelle: "Culture", href: "/art-culture" },
  { libelle: "Musique", href: "/actu-music" },
  { libelle: "Sport", href: "/sport" },
]

/** Menu « Plus ». */
export const navPlus: LienNav[] = [
  { libelle: "Actu People", href: "/actu-people" },
  { libelle: "Mode & Style", href: "/mode-style" },
  { libelle: "Prévention", href: "/prevention" },
  { libelle: "Publicité", href: "/publicite" },
  { libelle: "À propos", href: "/a-propos" },
  { libelle: "Contact", href: "/contact" },
]

export const navRubriques: LienNav[] = [
  { libelle: "Actualités", href: "/actualites" },
  { libelle: "Art & Culture", href: "/art-culture" },
  { libelle: "Actu Music", href: "/actu-music" },
  { libelle: "Actu People", href: "/actu-people" },
  { libelle: "Mode & Style", href: "/mode-style" },
  { libelle: "Sport", href: "/sport" },
  { libelle: "Prévention", href: "/prevention" },
  { libelle: "Agenda", href: "/agenda" },
]

export const estActif = (pathname: string, href: string) =>
  href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`)
