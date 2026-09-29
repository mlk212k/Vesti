/**
 * Accès aux articles. Seul point de lecture : pour brancher un CMS
 * (Sanity, Strapi, WordPress headless, Supabase…), réécrire ces fonctions
 * sans toucher aux pages. Elles sont asynchrones pour cette raison.
 */
import { articles as articlesReels } from "@/data/articles"
import { articlesDemo } from "@/data/demo"
import type { Article } from "@/types/article"
import type { CategorieSlug } from "@/types/category"
import { normaliser } from "@/lib/utils/texte"
import { modeDemo } from "./demo"

function tous(): Article[] {
  const liste = modeDemo ? [...articlesReels, ...articlesDemo] : articlesReels
  return [...liste].sort((a, b) => b.publieLe.localeCompare(a.publieLe))
}

export interface Page<T> {
  elements: T[]
  page: number
  pages: number
  total: number
}

export const PAR_PAGE = 9

export async function listerArticles(
  options: {
    categorie?: CategorieSlug
    q?: string
    page?: number
    parPage?: number
  } = {},
): Promise<Page<Article>> {
  const { categorie, q, page = 1, parPage = PAR_PAGE } = options
  let liste = tous()
  // « actualites » est le flux général : il contient toutes les rubriques.
  if (categorie && categorie !== "actualites")
    liste = liste.filter((a) => a.categorie === categorie)
  if (q) {
    const n = normaliser(q)
    liste = liste.filter((a) =>
      normaliser(`${a.titre} ${a.chapeau} ${(a.lieux ?? []).join(" ")}`).includes(n),
    )
  }
  const pages = Math.max(1, Math.ceil(liste.length / parPage))
  const p = Math.min(Math.max(1, page), pages)
  return {
    elements: liste.slice((p - 1) * parPage, p * parPage),
    page: p,
    pages,
    total: liste.length,
  }
}

export async function articlesRecents(n: number, sauf?: string): Promise<Article[]> {
  return tous()
    .filter((a) => a.slug !== sauf)
    .slice(0, n)
}

/** Une : l'article marqué `une`, sinon le plus récent, puis les suivants. */
export async function une(): Promise<{
  principal: Article | null
  secondaires: Article[]
  suite: Article[]
}> {
  const liste = tous()
  const principal = liste.find((a) => a.une) ?? liste[0] ?? null
  const reste = liste.filter((a) => a !== principal)
  const suite = reste.slice(3, 9)
  // Rangées complètes de trois : pas d'article orphelin en fin de grille.
  return {
    principal,
    secondaires: reste.slice(0, 3),
    suite: suite.length >= 3 ? suite.slice(0, suite.length - (suite.length % 3)) : suite,
  }
}

export async function articleParSlug(slug: string): Promise<Article | null> {
  return tous().find((a) => a.slug === slug) ?? null
}

export async function articlesSimilaires(article: Article, n = 3): Promise<Article[]> {
  const liste = tous().filter((a) => a.slug !== article.slug)
  const meme = liste.filter((a) => a.categorie === article.categorie)
  return [...meme, ...liste.filter((a) => a.categorie !== article.categorie)].slice(0, n)
}

export async function slugsArticles(): Promise<string[]> {
  return tous().map((a) => a.slug)
}

export async function tousArticles(): Promise<Article[]> {
  return tous()
}
