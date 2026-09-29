export type TypeResultat = "article" | "emission" | "podcast" | "evenement"

export interface Resultat {
  type: TypeResultat
  titre: string
  href: string
  contexte: string
  extrait?: string
}

export const libellesTypes: Record<TypeResultat, string> = {
  article: "Articles",
  emission: "Émissions",
  podcast: "Podcasts",
  evenement: "Agenda",
}
