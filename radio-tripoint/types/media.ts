/** Visuel éditorial. `src` local (public/) ou distant autorisé dans next.config. */
export interface Visuel {
  src: string
  alt: string
  largeur: number
  hauteur: number
  credit?: string
}

/** Bloc de contenu riche, portable vers n'importe quel CMS headless. */
export type Bloc =
  | { type: "paragraphe"; texte: string }
  | { type: "intertitre"; texte: string }
  | { type: "citation"; texte: string; auteur?: string }
  | { type: "liste"; elements: string[] }
  | { type: "image"; visuel: Visuel; legende?: string }

/** Marqueur des contenus fictifs du mode démonstration. */
export interface Demo {
  demo?: boolean
}
