export type CategorieSlug =
  | "actualites"
  | "art-culture"
  | "actu-music"
  | "actu-people"
  | "mode-style"
  | "sport"
  | "prevention"

export interface Categorie {
  slug: CategorieSlug
  /** Nom complet (titre de page). */
  nom: string
  /** Libellé court (navigation, badges). */
  court: string
  /** Chemin de la page catégorie. */
  chemin: string
  accroche: string
  description: string
  /** Titre SEO complet. */
  titreSeo: string
}
