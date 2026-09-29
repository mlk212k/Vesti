import type { Article } from "@/types/article"

/**
 * Articles publiés. Vide tant que les articles du site actuel n'ont pas
 * été migrés (voir MIGRATION.md) : chaque rubrique affiche alors un état
 * vide soigné. Remplaçable par un CMS via `lib/contenu/articles.ts`.
 */
export const articles: Article[] = []
