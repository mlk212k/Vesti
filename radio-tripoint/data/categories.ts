import type { Categorie, CategorieSlug } from "@/types/category"

export const categories: Record<CategorieSlug, Categorie> = {
  actualites: {
    slug: "actualites",
    nom: "Actualités",
    court: "Actu",
    chemin: "/actualites",
    accroche: "Ce qui se passe des deux côtés de la Moselle, et au-delà.",
    description:
      "Toute l'actualité locale et transfrontalière : Sierck-les-Bains, Apach, Schengen, Perl, la Moselle, le Luxembourg et la Sarre.",
    titreSeo: "Actualités des Trois Frontières — Moselle, Luxembourg, Sarre",
  },
  "art-culture": {
    slug: "art-culture",
    nom: "Art & Culture",
    court: "Culture",
    chemin: "/art-culture",
    accroche: "Expositions, patrimoine, scènes et créateurs du territoire.",
    description:
      "Expositions, spectacles, patrimoine et initiatives culturelles de la Grande Région, vus depuis les Trois Frontières.",
    titreSeo: "Art & Culture — Trois Frontières et Grande Région",
  },
  "actu-music": {
    slug: "actu-music",
    nom: "Actu Music",
    court: "Musique",
    chemin: "/actu-music",
    accroche: "Sorties, concerts et artistes qui font vibrer la région.",
    description: "L'actualité musicale : sorties, concerts, festivals et artistes de la région.",
    titreSeo: "Actu Music — concerts et artistes des Trois Frontières",
  },
  "actu-people": {
    slug: "actu-people",
    nom: "Actu People",
    court: "People",
    chemin: "/actu-people",
    accroche: "Celles et ceux qui font parler d'eux.",
    description: "Portraits, rencontres et actualité des personnalités, d'ici et d'ailleurs.",
    titreSeo: "Actu People — portraits et rencontres",
  },
  "mode-style": {
    slug: "mode-style",
    nom: "Mode & Style",
    court: "Mode",
    chemin: "/mode-style",
    accroche: "Tendances, créateurs et savoir-faire.",
    description: "Tendances, créateurs, boutiques et savoir-faire : la rubrique mode et style.",
    titreSeo: "Mode & Style — tendances et créateurs",
  },
  sport: {
    slug: "sport",
    nom: "Sport",
    court: "Sport",
    chemin: "/sport",
    accroche: "Clubs, résultats et exploits du territoire.",
    description: "Le sport local et transfrontalier : clubs, compétitions, résultats et portraits.",
    titreSeo: "Sport — clubs et compétitions des Trois Frontières",
  },
  prevention: {
    slug: "prevention",
    nom: "Prévention & Sensibilisation",
    court: "Prévention",
    chemin: "/prevention",
    accroche: "S'informer pour se protéger, et protéger les autres.",
    description:
      "Santé, sécurité routière, numérique, solidarité : les messages de prévention et de sensibilisation relayés par Radio Tripoint.",
    titreSeo: "Prévention & Sensibilisation",
  },
}

export const ordreCategories: CategorieSlug[] = [
  "actualites",
  "art-culture",
  "actu-music",
  "actu-people",
  "mode-style",
  "sport",
  "prevention",
]

/** Rubriques thématiques (tout sauf le flux général). */
export const rubriques = ordreCategories.filter((c) => c !== "actualites")
