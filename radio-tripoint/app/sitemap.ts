import type { MetadataRoute } from "next"
import { site } from "@/config/site"
import { categories, ordreCategories } from "@/data/categories"
import { tousArticles } from "@/lib/contenu/articles"
import { listerEmissions } from "@/lib/contenu/emissions"
import { tousEvenements } from "@/lib/contenu/evenements"
import { listerEpisodes } from "@/lib/contenu/podcasts"

/** Sitemap dynamique. Les contenus de démonstration en sont exclus. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const u = (p: string) => `${site.url}${p}`
  const [articles, emissions, episodes, evenements] = await Promise.all([
    tousArticles(),
    listerEmissions(),
    listerEpisodes(),
    tousEvenements(),
  ])
  const statiques: MetadataRoute.Sitemap = [
    { url: u("/"), changeFrequency: "daily", priority: 1 },
    ...ordreCategories.map((c) => ({
      url: u(categories[c].chemin),
      changeFrequency: "daily" as const,
      priority: c === "actualites" ? 0.9 : 0.7,
    })),
    { url: u("/emissions"), changeFrequency: "weekly", priority: 0.8 },
    { url: u("/podcasts"), changeFrequency: "daily", priority: 0.8 },
    { url: u("/agenda"), changeFrequency: "daily", priority: 0.8 },
    { url: u("/publicite"), changeFrequency: "monthly", priority: 0.6 },
    { url: u("/a-propos"), changeFrequency: "monthly", priority: 0.5 },
    { url: u("/contact"), changeFrequency: "yearly", priority: 0.5 },
    { url: u("/soumettre-une-information"), changeFrequency: "yearly", priority: 0.4 },
    { url: u("/mentions-legales"), changeFrequency: "yearly", priority: 0.1 },
    { url: u("/politique-confidentialite"), changeFrequency: "yearly", priority: 0.1 },
  ]
  return [
    ...statiques,
    ...articles
      .filter((a) => !a.demo)
      .map((a) => ({
        url: u(`/actualites/${a.slug}`),
        lastModified: a.modifieLe ?? a.publieLe,
        changeFrequency: "weekly" as const,
        priority: 0.7,
      })),
    ...emissions.map((e) => ({
      url: u(`/emissions/${e.slug}`),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    ...episodes
      .filter((e) => !e.demo)
      .map((e) => ({ url: u(`/podcasts/${e.slug}`), lastModified: e.publieLe, priority: 0.6 })),
    ...evenements
      .filter((e) => !e.demo)
      .map((e) => ({ url: u(`/agenda/${e.slug}`), lastModified: e.debut, priority: 0.6 })),
  ]
}
