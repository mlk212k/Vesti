import type { Emission } from "@/types/show"

/** Ce que le client a besoin de savoir de la grille : rien de plus. */
export type GrilleClient = Pick<Emission, "slug" | "nom" | "thematique" | "creneaux">[]

export const versGrille = (emissions: Emission[]): GrilleClient =>
  emissions.map(({ slug, nom, thematique, creneaux }) => ({ slug, nom, thematique, creneaux }))
