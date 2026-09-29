import type { Emission } from "@/types/show"

/**
 * Émissions publiées sur le site actuel (« Nos émissions »).
 *
 * Règle : aucun horaire, animateur ou description n'est inventé. Les
 * champs `creneaux: []` et `presentation: null` s'affichent « à venir » ;
 * les compléter ici suffit à alimenter la carte, la page émission, la
 * section « En ce moment » et les données structurées.
 */
export const emissions: Emission[] = [
  {
    slug: "generation-z",
    nom: "Génération Z",
    accroche: "Le rendez-vous des 15-17 ans.",
    presentation: null,
    thematique: "Jeunesse",
    creneaux: [],
    teinte: "accent",
  },
  {
    slug: "on-vous-donne-la-parole",
    nom: "On Vous Donne la Parole",
    accroche: null,
    presentation: null,
    thematique: "Parole aux auditeurs",
    creneaux: [],
    teinte: "encre",
  },
  {
    slug: "bien-etre-therapies-alternatives",
    nom: "Bien-être & Thérapies Alternatives",
    accroche: null,
    presentation: null,
    thematique: "Bien-être",
    creneaux: [],
    teinte: "sable",
  },
  {
    slug: "histoire-memoire-regionale",
    nom: "Histoire & Mémoire Régionale",
    accroche: null,
    presentation: null,
    thematique: "Histoire",
    categorie: "art-culture",
    creneaux: [],
    teinte: "nuit",
  },
  {
    slug: "talents-du-coin",
    nom: "Talents du coin !",
    accroche: null,
    presentation: null,
    thematique: "Talents locaux",
    creneaux: [],
    teinte: "accent",
  },
  {
    slug: "ole-ole",
    nom: "Olé Olé",
    accroche: null,
    presentation: null,
    thematique: "À l'antenne",
    creneaux: [],
    teinte: "sable",
  },
]
