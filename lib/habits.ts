import { z } from "zod";
import { PLANS } from "./plans";

/**
 * Les cinq jauges de l'inscription, et le calcul qu'elles servent.
 *
 * ── À quoi sert vraiment ce fichier ─────────────────────────────────────────
 *
 * L'ancien onboarding demandait une taille, un poids, une morphologie. Des
 * renseignements : l'app apprenait quelque chose, la personne n'apprenait rien.
 * Ces cinq questions font l'inverse. « Vingt minutes le matin » est une
 * information tiède ; « 121 heures par an » est la même information rendue à
 * son propriétaire sous une forme qu'il n'avait jamais calculée.
 *
 * Une seule des cinq réponses pilote une décision du produit — le budget, qui
 * borne les recommandations d'achat du plan Styliste. Les quatre autres
 * existent pour l'écran de récapitulatif.
 *
 * ── ⚠️ LA RÈGLE D'HONNÊTETÉ, qui prime sur tout le reste ────────────────────
 *
 * Ce sont des ESTIMATIONS DÉCLARÉES, pas des mesures. Personne n'a chronométré
 * ses matins ni compté ses vêtements. Trois conséquences, et aucune n'est
 * négociable :
 *
 *  1. Tout écran qui restitue ces chiffres dit « d'après toi ». Un chiffre
 *     présenté comme un relevé alors qu'il sort d'un curseur est un mensonge,
 *     et un mensonge qui se retourne : la personne SAIT qu'elle a bougé le
 *     curseur au hasard, et le voir appelé « ton gaspillage » décrédibilise
 *     tout l'écran.
 *
 *  2. Les arrondis vont vers le BAS (`Math.floor`). Arrondir vers le haut
 *     gonflerait le chiffre dans notre sens commercial, sur une donnée qu'on
 *     ne peut pas vérifier. En cas de doute, le chiffre le plus petit.
 *
 *  3. Une jauge jamais touchée vaut `null`, pas sa valeur de départ — voir
 *     `components/onboarding/gauge.tsx`. Enregistrer la position par défaut
 *     comme une réponse, c'est fabriquer des données, puis les lui resservir
 *     comme étant les siennes.
 */

/**
 * Bornes des jauges. ⚠️ Reprises des contraintes CHECK de la migration
 * `0022_habits.sql` — une valeur hors bornes n'est pas une donnée bizarre,
 * c'est un rejet Postgres à l'écriture.
 */
export const MORNING_MINUTES = { min: 0, max: 45 } as const;
export const OUTFIT_CHANGES = { min: 0, max: 7 } as const;
export const CLOTHING_BUDGET = { min: 0, max: 300 } as const;
export const WORN_OUT_OF_TEN = { min: 0, max: 10 } as const;
export const STYLE_CONFIDENCE = { min: 1, max: 10 } as const;

/**
 * Ce que la personne a répondu. Tout est `nullable` : chaque jauge se saute,
 * et l'onboarding entier se saute. Aucun écran ne doit supposer le contraire.
 */
export interface Habits {
  morning_minutes: number | null;
  outfit_changes_per_week: number | null;
  clothing_budget_eur: number | null;
  worn_out_of_ten: number | null;
  style_confidence: number | null;
}

export const EMPTY_HABITS: Habits = {
  morning_minutes: null,
  outfit_changes_per_week: null,
  clothing_budget_eur: null,
  worn_out_of_ten: null,
  style_confidence: null,
};

export const habitsSchema = z.object({
  morning_minutes: bounded(MORNING_MINUTES),
  outfit_changes_per_week: bounded(OUTFIT_CHANGES),
  clothing_budget_eur: bounded(CLOTHING_BUDGET),
  worn_out_of_ten: bounded(WORN_OUT_OF_TEN),
  style_confidence: bounded(STYLE_CONFIDENCE),
});

function bounded({ min, max }: { min: number; max: number }) {
  return z.number().int().min(min).max(max).nullable();
}

/** Clé d'une habitude, pour typer les écrans sans recopier la liste. */
export type HabitKey = keyof Habits;

/**
 * La définition d'une question, écran compris.
 *
 * Les libellés vivent ici et non dans le JSX parce que deux écrans s'en
 * servent : la question elle-même, et le récapitulatif qui rappelle la réponse
 * donnée. Deux copies d'un même libellé finissent par ne plus se répondre.
 */
export interface GaugeQuestion {
  key: HabitKey;
  /** La question, telle qu'elle est posée. */
  title: string;
  /** Ce qui la désamorce : pourquoi on demande, ou pourquoi ce n'est pas grave. */
  help: string;
  bounds: { min: number; max: number };
  /** Position de départ du curseur. ⚠️ N'est PAS une réponse tant qu'on n'y a pas touché. */
  start: number;
  step: number;
  /** Valeur rendue lisible : « 20 min », « 80 € », « 4 sur 10 ». */
  format: (value: number) => string;
  /** Les deux bouts de la jauge, sous le curseur. */
  ends: readonly [string, string];
}

export const GAUGE_QUESTIONS: readonly GaugeQuestion[] = [
  {
    key: "morning_minutes",
    title: "Le matin, tu passes combien de temps à choisir ta tenue ?",
    help: "Entre le moment où tu ouvres l'armoire et celui où tu es habillé.",
    bounds: MORNING_MINUTES,
    // 15 min : la position de départ ne doit accuser personne. Partir de 40
    // poserait d'emblée « tu perds un temps fou », alors qu'on ne sait rien.
    start: 15,
    step: 1,
    format: (v) => (v === 0 ? "Aucun" : `${v} min`),
    ends: ["Je prends le premier truc", "45 min et plus"],
  },
  {
    key: "outfit_changes_per_week",
    title: "Combien de fois par semaine tu te changes parce que ça ne va pas ?",
    help: "La tenue enfilée, regardée dans le miroir, puis retirée.",
    bounds: OUTFIT_CHANGES,
    start: 2,
    step: 1,
    format: (v) => (v === 0 ? "Jamais" : `${v} fois`),
    ends: ["Jamais", "Tous les jours"],
  },
  {
    key: "clothing_budget_eur",
    title: "Tu dépenses combien en vêtements par mois ?",
    // ⚠️ La seule des cinq qui change le comportement du produit. La personne a
    // le droit de savoir pourquoi on la lui demande, et surtout ce qu'elle y
    // gagne : sans ça, la question ressemble à de la collecte.
    help: "En moyenne sur l'année, soldes comprises. Ça sert à ne jamais te conseiller une pièce hors de ton budget.",
    bounds: CLOTHING_BUDGET,
    start: 60,
    step: 5,
    format: (v) => (v === 0 ? "Rien" : `${v} €`),
    ends: ["Rien", "300 € et plus"],
  },
  {
    key: "worn_out_of_ten",
    title: "Sur 10 vêtements achetés, combien tu portes vraiment ?",
    help: "Ceux que tu ressors, pas ceux que tu as mis une fois.",
    bounds: WORN_OUT_OF_TEN,
    start: 5,
    step: 1,
    format: (v) => `${v} sur 10`,
    ends: ["Aucun", "Tous les 10"],
  },
  {
    key: "style_confidence",
    title: "Tu te sens bien dans ce que tu portes ?",
    help: "On te reposera la question dans trois mois, pour comparer.",
    bounds: STYLE_CONFIDENCE,
    start: 5,
    step: 1,
    format: (v) => `${v} sur 10`,
    ends: ["Pas du tout", "Complètement"],
  },
] as const;

/**
 * Le découpage en écrans : une question par écran, SAUF le budget et la part
 * réellement portée, qui vont ensemble.
 *
 * ⚠️ C'est un choix, pas une commodité de mise en page. Ces deux réponses sont
 * les seules à se multiplier l'une l'autre — c'est leur produit qui donne le
 * chiffre du gaspillage. Posées sur deux écrans, on répond « 80 € » puis, une
 * page plus loin et sans y penser, « 4 sur 10 » : le lien entre les deux ne se
 * fait jamais dans la tête de la personne, et le récapitulatif lui tombe dessus
 * comme un calcul qu'on aurait fait à sa place. Côte à côte, elle voit les deux
 * curseurs en même temps et commence le calcul elle-même.
 *
 * Les autres restent seules : une question par écran est ce qui fait qu'on y
 * réfléchit au lieu de balayer un formulaire.
 */
export const GAUGE_SCREENS: readonly (readonly HabitKey[])[] = [
  ["morning_minutes"],
  ["outfit_changes_per_week"],
  ["clothing_budget_eur", "worn_out_of_ten"],
  ["style_confidence"],
] as const;

/** Titre coiffant un écran qui porte plusieurs jauges. */
export const SCREEN_HEADINGS: Partial<Record<HabitKey, string>> = {
  clothing_budget_eur: "Parlons argent",
};

export function questionFor(key: HabitKey): GaugeQuestion {
  const found = GAUGE_QUESTIONS.find((q) => q.key === key);
  // Impossible avec les types actuels — mais `GAUGE_SCREENS` et
  // `GAUGE_QUESTIONS` sont deux listes qu'on peut désaccorder en éditant l'une
  // sans l'autre, et un écran vide se remarquerait moins qu'une erreur.
  if (!found) throw new Error(`Question de jauge inconnue : ${key}`);
  return found;
}

/* -------------------------------------------------------------------------- */
/* Le calcul du récapitulatif                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Une ligne du récapitulatif : le chiffre qu'on rend, et d'où il sort.
 *
 * `source` n'est pas décoratif. C'est la phrase qui rappelle à la personne
 * QUELLE réponse a produit ce chiffre — « 20 min par matin ». Sans elle, un
 * grand nombre posé sur un écran ressemble à une donnée qu'on aurait mesurée
 * sur son dos.
 */
export interface Insight {
  key: string;
  value: string;
  label: string;
  source: string;
}

/** Nombre à la française, sans décimale : 7300 → « 7 300 ». */
function fr(value: number): string {
  return Math.floor(value).toLocaleString("fr-FR");
}

/**
 * Le temps passé à s'habiller, ramené à l'année.
 *
 * 365 jours : on s'habille aussi le week-end. `Math.floor` parce qu'on ne
 * gonfle pas un chiffre qu'on n'a pas mesuré.
 */
export function hoursPerYear(minutesPerDay: number): number {
  return Math.floor((minutesPerDay * 365) / 60);
}

/**
 * L'argent dépensé en vêtements qui ne sont pas portés, sur un an.
 *
 * budget mensuel × 12 × la part non portée. Croiser DEUX réponses de la
 * personne est ce qui rend ce chiffre saisissant : aucune des deux, seule, ne
 * dit quoi que ce soit, et elle n'a jamais fait la multiplication.
 *
 * ⚠️ Ce calcul suppose que les vêtements coûtent en moyenne le même prix, ce
 * qui est faux — on achète moins souvent un manteau qu'un t-shirt. C'est une
 * approximation, et c'est pourquoi l'écran dit « d'après toi » plutôt que
 * d'imprimer le chiffre comme un relevé de compte.
 */
export function wastedEurPerYear(budgetPerMonth: number, wornOutOfTen: number): number {
  const unwornShare = (WORN_OUT_OF_TEN.max - wornOutOfTen) / WORN_OUT_OF_TEN.max;
  return Math.floor(budgetPerMonth * 12 * unwornShare);
}

/** Ce que coûte une année de Vesti. Calculé, pour ne pas mentir après une hausse de prix. */
export function vestiEurPerYear(): number {
  return Math.round(PLANS.pro.priceEur * 12);
}

/**
 * Les lignes à afficher, d'après ce qui a été répondu.
 *
 * ── Pourquoi le zéro est écarté ─────────────────────────────────────────────
 *
 * Une jauge laissée à zéro produit « 0 heure par an », qu'il serait grotesque
 * d'annoncer comme une découverte. Pire, la ligne suivante — « et si tu
 * récupérais ce temps » — deviendrait une promesse de rien. Quelqu'un qui
 * répond honnêtement zéro n'a pas ce problème : on ne le lui invente pas.
 *
 * Une jauge non répondue (`null`) est écartée pour la même raison, en plus
 * évidente. Le récapitulatif peut donc être VIDE, et l'écran doit le supporter.
 */
export function insightsFrom(habits: Habits): Insight[] {
  const out: Insight[] = [];
  const { morning_minutes, outfit_changes_per_week, clothing_budget_eur, worn_out_of_ten } =
    habits;

  if (morning_minutes !== null && morning_minutes > 0) {
    out.push({
      key: "time",
      value: `${fr(hoursPerYear(morning_minutes))} h`,
      label: "devant ton armoire, chaque année",
      source: `${morning_minutes} min par matin, 365 matins`,
    });
  }

  if (outfit_changes_per_week !== null && outfit_changes_per_week > 0) {
    out.push({
      key: "changes",
      value: fr(outfit_changes_per_week * 52),
      label: "tenues enfilées puis retirées, chaque année",
      source: `${outfit_changes_per_week} fois par semaine`,
    });
  }

  // ⚠️ Cette ligne exige les DEUX réponses. Avec le budget seul on ne connaît
  // qu'une dépense, qui n'a rien d'un gaspillage ; avec la proportion seule on
  // n'a pas d'euros. Les afficher séparément donnerait deux demi-chiffres dont
  // aucun ne dit ce qu'on veut dire.
  if (
    clothing_budget_eur !== null &&
    clothing_budget_eur > 0 &&
    worn_out_of_ten !== null &&
    worn_out_of_ten < WORN_OUT_OF_TEN.max
  ) {
    out.push({
      key: "waste",
      value: `${fr(wastedEurPerYear(clothing_budget_eur, worn_out_of_ten))} €`,
      label: "de vêtements jamais portés, chaque année",
      source: `${clothing_budget_eur} € par mois, ${worn_out_of_ten} pièces sur 10 portées`,
    });
  }

  return out;
}

/**
 * La comparaison finale : ce que le gaspillage déclaré représente en années
 * d'abonnement.
 *
 * ⚠️ Rendue `null` dès que la comparaison ne tient pas — pas de gaspillage
 * chiffré, ou un gaspillage inférieur au prix. « Tu gaspilles 40 € par an,
 * l'abonnement coûte 108 € » est un argument CONTRE nous ; le taire serait
 * malhonnête, mais l'habiller en argument pour le serait davantage. On ne
 * montre donc la comparaison que quand elle est vraie, et sinon rien.
 */
export function wasteComparison(
  habits: Habits
): { wasted: number; price: number; ratio: number } | null {
  const { clothing_budget_eur, worn_out_of_ten } = habits;
  if (clothing_budget_eur === null || worn_out_of_ten === null) return null;
  if (clothing_budget_eur === 0 || worn_out_of_ten >= WORN_OUT_OF_TEN.max) return null;

  const wasted = wastedEurPerYear(clothing_budget_eur, worn_out_of_ten);
  const price = vestiEurPerYear();
  if (wasted < price) return null;

  return { wasted, price, ratio: Math.floor(wasted / price) };
}
