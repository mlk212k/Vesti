import type { Bloc } from "@/types/media"

export function texteBlocs(blocs: Bloc[]): string {
  return blocs
    .map((b) => {
      switch (b.type) {
        case "paragraphe":
        case "intertitre":
        case "citation":
          return b.texte
        case "liste":
          return b.elements.join(" ")
        case "image":
          return b.legende ?? ""
      }
    })
    .join(" ")
}

/** Temps de lecture, 220 mots/minute, minimum une minute. */
export function tempsLecture(blocs: Bloc[]): number {
  const mots = texteBlocs(blocs).split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.round(mots / 220))
}

/** Normalise pour la recherche : minuscules, sans accents. */
export function normaliser(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim()
}
