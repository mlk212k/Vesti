import { emissions as emissionsReelles } from "@/data/shows"
import { grilleDemo } from "@/data/demo"
import type { Emission } from "@/types/show"
import { modeDemo } from "./demo"

function toutes(): Emission[] {
  if (!modeDemo) return emissionsReelles
  const grille = grilleDemo(emissionsReelles.map((e) => e.slug))
  return emissionsReelles.map((e) => ({
    ...e,
    creneaux: e.creneaux.length ? e.creneaux : (grille[e.slug] ?? []),
  }))
}

export async function listerEmissions(): Promise<Emission[]> {
  return toutes()
}

export async function emissionParSlug(slug: string): Promise<Emission | null> {
  return toutes().find((e) => e.slug === slug) ?? null
}
