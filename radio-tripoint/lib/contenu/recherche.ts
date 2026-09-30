import { categories } from "@/data/categories"
import { dateLongue } from "@/lib/utils/dates"
import { normaliser } from "@/lib/utils/texte"
import { tousArticles } from "./articles"
import { listerEmissions } from "./emissions"
import { tousEvenements } from "./evenements"
import { listerEpisodes } from "./podcasts"
import type { Resultat } from "./recherche-types"

export { libellesTypes, type Resultat, type TypeResultat } from "./recherche-types"

/**
 * Recherche plein texte sur tout le contenu. Chaque terme doit apparaître
 * (sans accents, sans casse). Le titre pèse plus lourd que le corps.
 * Suffisant pour quelques milliers d'éléments ; au-delà, brancher un
 * moteur (Algolia, Meilisearch, Postgres FTS) derrière cette fonction.
 */
export async function rechercher(q: string, limite = 40): Promise<Resultat[]> {
  const termes = normaliser(q)
    .split(/\s+/)
    .filter((t) => t.length > 1)
  if (termes.length === 0) return []

  const [articles, emissions, episodes, evenements] = await Promise.all([
    tousArticles(),
    listerEmissions(),
    listerEpisodes(),
    tousEvenements(),
  ])

  const candidats: (Resultat & { titreN: string; corpsN: string })[] = [
    ...articles.map((a) => ({
      type: "article" as const,
      titre: a.titre,
      href: `/actualites/${a.slug}`,
      contexte: `${categories[a.categorie].nom} · ${dateLongue(a.publieLe)}`,
      extrait: a.chapeau,
      titreN: normaliser(a.titre),
      corpsN: normaliser(
        `${a.chapeau} ${(a.lieux ?? []).join(" ")} ${(a.tags ?? []).join(" ")} ${categories[a.categorie].nom}`,
      ),
    })),
    ...emissions.map((e) => ({
      type: "emission" as const,
      titre: e.nom,
      href: `/emissions/${e.slug}`,
      contexte: `Émission · ${e.thematique}`,
      extrait: e.accroche ?? undefined,
      titreN: normaliser(e.nom),
      corpsN: normaliser(`${e.accroche ?? ""} ${e.presentation ?? ""} ${e.thematique}`),
    })),
    ...episodes.map((p) => ({
      type: "podcast" as const,
      titre: p.titre,
      href: `/podcasts/${p.slug}`,
      contexte: `Podcast · ${dateLongue(p.publieLe)}`,
      extrait: p.description,
      titreN: normaliser(p.titre),
      corpsN: normaliser(p.description),
    })),
    ...evenements.map((ev) => ({
      type: "evenement" as const,
      titre: ev.titre,
      href: `/agenda/${ev.slug}`,
      contexte: `${ev.ville} · ${dateLongue(ev.debut)}`,
      extrait: ev.description,
      titreN: normaliser(ev.titre),
      corpsN: normaliser(`${ev.description} ${ev.ville} ${ev.lieu}`),
    })),
  ]

  return candidats
    .map((c) => {
      let score = 0
      for (const t of termes) {
        if (c.titreN.includes(t)) score += 3
        else if (c.corpsN.includes(t)) score += 1
        else return null
      }
      return { c, score }
    })
    .filter((x): x is { c: (typeof candidats)[number]; score: number } => x !== null)
    .sort((a, b) => b.score - a.score)
    .slice(0, limite)
    .map(({ c }) => ({
      type: c.type,
      titre: c.titre,
      href: c.href,
      contexte: c.contexte,
      extrait: c.extrait,
    }))
}
