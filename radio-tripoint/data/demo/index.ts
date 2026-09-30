/**
 * CONTENU DE DÉMONSTRATION — FICTIF.
 *
 * Chargé uniquement si NEXT_PUBLIC_DEMO_CONTENT=1. Sert à voir les gabarits
 * remplis pendant la recette. Chaque élément porte `demo: true`, affiche un
 * badge « Exemple », et un bandeau signale le mode sur tout le site.
 * Rien ici ne décrit un fait réel : ne pas activer en production.
 */
import type { Article } from "@/types/article"
import type { Episode } from "@/types/podcast"
import type { Evenement } from "@/types/event"
import type { Creneau } from "@/types/show"

const JOUR = 86_400_000
const maintenant = Date.now()
const il = (jours: number, heure = 9) => {
  const d = new Date(maintenant - jours * JOUR)
  d.setHours(heure, 0, 0, 0)
  return d.toISOString()
}
const dans = (jours: number, heure = 20) => {
  const d = new Date(maintenant + jours * JOUR)
  d.setHours(heure, 0, 0, 0)
  return d.toISOString()
}
const para = (texte: string) => ({ type: "paragraphe" as const, texte })
const CORPS_EXEMPLE = [
  para(
    "Ce texte est un contenu de démonstration. Il occupe la place d'un véritable article pour montrer la mise en page : longueur de ligne, interlignage, intertitres, citations et listes.",
  ),
  para(
    "Un article Radio Tripoint commence par l'essentiel — qui, quoi, où, quand — puis développe. Le chapeau, au-dessus, résume l'information en une ou deux phrases ; il sert aussi d'extrait dans les listes et de description pour les moteurs de recherche.",
  ),
  { type: "intertitre" as const, texte: "Un intertitre pour aérer la lecture" },
  para(
    "Les intertitres découpent les textes longs et facilitent la lecture sur téléphone, où la plupart des visiteurs arrivent. Ils sont repris dans la structure H2 de la page.",
  ),
  {
    type: "citation" as const,
    texte: "Une citation met en valeur une parole forte recueillie à l'antenne.",
    auteur: "Exemple de source",
  },
  {
    type: "liste" as const,
    elements: ["Un premier point à retenir", "Un deuxième point", "Un troisième point"],
  },
  para("Fin du contenu de démonstration."),
]

export const articlesDemo: Article[] = [
  {
    slug: "exemple-grande-une",
    titre:
      "Exemple d'article à la une : ce titre montre comment s'affiche une grande information locale",
    chapeau:
      "Le chapeau résume l'essentiel en une ou deux phrases. Il apparaît sous le titre, dans les cartes et dans les résultats de recherche.",
    categorie: "actualites",
    publieLe: il(0, 8),
    lieux: ["Sierck-les-Bains"],
    corps: CORPS_EXEMPLE,
    une: true,
    demo: true,
  },
  {
    slug: "exemple-actualite-transfrontaliere",
    titre: "Exemple : une information qui concerne les deux rives de la Moselle",
    chapeau: "Carte secondaire de la une. Titre sur trois lignes au maximum.",
    categorie: "actualites",
    publieLe: il(1),
    lieux: ["Schengen", "Perl"],
    corps: CORPS_EXEMPLE,
    demo: true,
  },
  {
    slug: "exemple-culture",
    titre: "Exemple de sujet culture : une exposition dans la Grande Région",
    chapeau: "Rubrique Art & Culture, affichée avec son badge de catégorie.",
    categorie: "art-culture",
    publieLe: il(2),
    corps: CORPS_EXEMPLE,
    demo: true,
  },
  {
    slug: "exemple-sport",
    titre: "Exemple de sujet sport : le week-end des clubs du territoire",
    chapeau: "Rubrique Sport. Les cartes gardent la même hiérarchie quelle que soit la rubrique.",
    categorie: "sport",
    publieLe: il(3),
    lieux: ["Apach"],
    corps: CORPS_EXEMPLE,
    demo: true,
  },
  {
    slug: "exemple-musique",
    titre: "Exemple Actu Music : une sortie d'album à écouter",
    chapeau: "Rubrique musique.",
    categorie: "actu-music",
    publieLe: il(4),
    corps: CORPS_EXEMPLE,
    demo: true,
  },
  {
    slug: "exemple-prevention",
    titre: "Exemple de message de prévention relayé à l'antenne",
    chapeau: "Rubrique Prévention & Sensibilisation.",
    categorie: "prevention",
    publieLe: il(6),
    corps: CORPS_EXEMPLE,
    demo: true,
  },
  {
    slug: "exemple-people",
    titre: "Exemple Actu People : portrait d'une personnalité",
    chapeau: "Rubrique Actu People.",
    categorie: "actu-people",
    publieLe: il(8),
    corps: CORPS_EXEMPLE,
    demo: true,
  },
  {
    slug: "exemple-mode",
    titre: "Exemple Mode & Style : un savoir-faire local",
    chapeau: "Rubrique Mode & Style.",
    categorie: "mode-style",
    publieLe: il(10),
    corps: CORPS_EXEMPLE,
    demo: true,
  },
]

/** Tonalité courte générée localement (public/demo), pour tester le lecteur. */
const AUDIO_DEMO = "/demo/tonalite.wav"

export const episodesDemo: Episode[] = [
  {
    slug: "exemple-replay-generation-z",
    titre: "Exemple de replay — Génération Z",
    description: "Épisode fictif pour montrer une fiche replay.",
    emission: "generation-z",
    theme: "emissions",
    publieLe: il(1),
    duree: 10,
    audioUrl: AUDIO_DEMO,
    demo: true,
  },
  {
    slug: "exemple-podcast-actualite",
    titre: "Exemple de podcast d'actualité",
    description: "Épisode fictif, thème Actualités.",
    theme: "actualites",
    publieLe: il(2),
    duree: 10,
    audioUrl: AUDIO_DEMO,
    demo: true,
  },
  {
    slug: "exemple-podcast-culture",
    titre: "Exemple de podcast culture",
    description: "Épisode fictif, thème Culture.",
    theme: "culture",
    publieLe: il(4),
    duree: 10,
    audioUrl: AUDIO_DEMO,
    demo: true,
  },
  {
    slug: "exemple-replay-talents",
    titre: "Exemple de replay — Talents du coin !",
    description: "Épisode fictif rattaché à une émission.",
    emission: "talents-du-coin",
    theme: "emissions",
    publieLe: il(6),
    duree: 10,
    audioUrl: AUDIO_DEMO,
    demo: true,
  },
  {
    slug: "exemple-podcast-sport",
    titre: "Exemple de podcast sport",
    description: "Épisode fictif, thème Sport.",
    theme: "sport",
    publieLe: il(9),
    duree: 10,
    audioUrl: AUDIO_DEMO,
    demo: true,
  },
]

export const evenementsDemo: Evenement[] = [
  {
    slug: "exemple-evenement-sierck",
    titre: "Exemple d'événement à Sierck-les-Bains",
    description: "Événement fictif pour montrer une fiche agenda.",
    debut: dans(0, 20),
    lieu: "Lieu à préciser",
    ville: "Sierck-les-Bains",
    pays: "FR",
    demo: true,
  },
  {
    slug: "exemple-evenement-schengen",
    titre: "Exemple d'événement à Schengen",
    description: "Événement fictif, côté luxembourgeois.",
    debut: dans(3, 18),
    lieu: "Lieu à préciser",
    ville: "Schengen",
    pays: "LU",
    demo: true,
  },
  {
    slug: "exemple-evenement-perl",
    titre: "Exemple d'événement à Perl",
    description: "Événement fictif, côté allemand.",
    debut: dans(9, 15),
    lieu: "Lieu à préciser",
    ville: "Perl",
    pays: "DE",
    demo: true,
  },
  {
    slug: "exemple-evenement-apach",
    titre: "Exemple d'événement à Apach",
    description: "Événement fictif.",
    debut: dans(20, 10),
    lieu: "Lieu à préciser",
    ville: "Apach",
    pays: "FR",
    demo: true,
  },
]

/** Grille fictive pour tester « En ce moment » : une émission chaque heure. */
export function grilleDemo(slugs: string[]): Record<string, Creneau[]> {
  const jours = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"] as const
  const grille: Record<string, Creneau[]> = {}
  for (let h = 0; h < 24; h++) {
    const slug = slugs[h % slugs.length]
    const pad = (n: number) => String(n).padStart(2, "0")
    for (const jour of jours) {
      ;(grille[slug] ??= []).push({
        jour,
        debut: `${pad(h)}:00`,
        fin: h === 23 ? "24:00" : `${pad(h + 1)}:00`,
      })
    }
  }
  return grille
}
