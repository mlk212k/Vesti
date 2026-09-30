import { evenements as evenementsReels } from "@/data/events"
import { evenementsDemo } from "@/data/demo"
import type { Evenement } from "@/types/event"
import { cleJour } from "@/lib/utils/dates"
import { modeDemo } from "./demo"

export type Periode = "tout" | "aujourdhui" | "semaine" | "mois"

function tous(): Evenement[] {
  const liste = modeDemo ? [...evenementsReels, ...evenementsDemo] : evenementsReels
  return [...liste].sort((a, b) => a.debut.localeCompare(b.debut))
}

/** Un événement reste « à venir » jusqu'à sa fin (ou la fin de son jour). */
function nonTermine(e: Evenement, maintenant: Date): boolean {
  if (e.fin) return new Date(e.fin) >= maintenant
  return cleJour(new Date(e.debut)) >= cleJour(maintenant)
}

export async function listerEvenements(
  options: { periode?: Periode; ville?: string } = {},
  maintenant = new Date(),
) {
  const { periode = "tout", ville } = options
  let liste = tous().filter((e) => nonTermine(e, maintenant))
  if (ville) liste = liste.filter((e) => e.ville === ville)
  const jour = cleJour(maintenant)
  const limite = (jours: number) => cleJour(new Date(maintenant.getTime() + jours * 86_400_000))
  if (periode === "aujourdhui") liste = liste.filter((e) => cleJour(new Date(e.debut)) <= jour)
  if (periode === "semaine") liste = liste.filter((e) => cleJour(new Date(e.debut)) <= limite(7))
  if (periode === "mois") liste = liste.filter((e) => cleJour(new Date(e.debut)) <= limite(31))
  return liste
}

/** Villes présentes dans l'agenda (les filtres n'affichent que du réel). */
export async function villesAgenda(): Promise<string[]> {
  return [...new Set(tous().map((e) => e.ville))].sort((a, b) => a.localeCompare(b, "fr"))
}

export async function evenementParSlug(slug: string): Promise<Evenement | null> {
  return tous().find((e) => e.slug === slug) ?? null
}

export async function tousEvenements(): Promise<Evenement[]> {
  return tous()
}
