import { episodes as episodesReels } from "@/data/podcasts"
import { episodesDemo } from "@/data/demo"
import type { Episode, ThemePodcast } from "@/types/podcast"
import { normaliser } from "@/lib/utils/texte"
import { modeDemo } from "./demo"

export const themesPodcast: { valeur: ThemePodcast | "toutes"; libelle: string }[] = [
  { valeur: "toutes", libelle: "Toutes" },
  { valeur: "actualites", libelle: "Actualités" },
  { valeur: "culture", libelle: "Culture" },
  { valeur: "musique", libelle: "Musique" },
  { valeur: "sport", libelle: "Sport" },
  { valeur: "emissions", libelle: "Émissions" },
]

function tous(): Episode[] {
  const liste = modeDemo ? [...episodesReels, ...episodesDemo] : episodesReels
  return [...liste].sort((a, b) => b.publieLe.localeCompare(a.publieLe))
}

export async function listerEpisodes(
  options: { theme?: string; q?: string; emission?: string } = {},
): Promise<Episode[]> {
  let liste = tous()
  if (options.theme && options.theme !== "toutes")
    liste = liste.filter((e) => e.theme === options.theme)
  if (options.emission) liste = liste.filter((e) => e.emission === options.emission)
  if (options.q) {
    const n = normaliser(options.q)
    liste = liste.filter((e) => normaliser(`${e.titre} ${e.description}`).includes(n))
  }
  return liste
}

export async function episodeParSlug(slug: string): Promise<Episode | null> {
  return tous().find((e) => e.slug === slug) ?? null
}
