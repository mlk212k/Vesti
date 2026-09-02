/**
 * Agrégats du tableau de bord. Fonctions pures : la page les alimente avec ce
 * qu'elle a lu en base, et elles restent testables sans base ni réseau.
 */

export interface AnalysisPoint {
  id: string;
  score: number | null;
  created_at: string;
}

export interface ItemPoint {
  category: string;
  label: string;
}

export interface ScoreTrend {
  /** Points chronologiques (le plus ancien d'abord), sans les analyses non notées. */
  points: { id: string; score: number; date: string }[];
  average: number | null;
  best: number | null;
  /**
   * Écart entre la moyenne des analyses récentes et celle des précédentes.
   * `null` tant qu'il n'y a pas assez d'historique pour que ce soit honnête.
   */
  delta: number | null;
}

/** Nombre minimal d'analyses par groupe pour qu'une tendance veuille dire quelque chose. */
const MIN_PER_GROUP = 2;

export function computeScoreTrend(analyses: AnalysisPoint[]): ScoreTrend {
  const points = analyses
    .filter((a): a is AnalysisPoint & { score: number } => typeof a.score === "number")
    .map((a) => ({ id: a.id, score: a.score, date: a.created_at }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  if (points.length === 0) {
    return { points: [], average: null, best: null, delta: null };
  }

  const scores = points.map((p) => p.score);
  const average = Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length);
  const best = Math.max(...scores);

  // On ne montre une tendance que si les deux moitiés sont assez fournies :
  // annoncer « +12 » sur deux analyses serait du bruit présenté comme un signal.
  let delta: number | null = null;
  if (points.length >= MIN_PER_GROUP * 2) {
    const middle = Math.floor(points.length / 2);
    const older = scores.slice(0, middle);
    const recent = scores.slice(middle);
    const mean = (values: number[]) =>
      values.reduce((sum, v) => sum + v, 0) / values.length;
    delta = Math.round(mean(recent) - mean(older));
  }

  return { points, average, best, delta };
}

export interface TopItem {
  label: string;
  category: string;
  count: number;
}

/**
 * Pièces qui reviennent le plus souvent dans les tenues analysées.
 *
 * Le regroupement se fait sur le libellé normalisé (casse et accents) : « Jean
 * brut » et « jean brut » sont la même pièce. C'est une approximation assumée —
 * on ne sait pas si c'est le même vêtement physique, seulement que la même
 * description revient.
 */
export function computeTopItems(items: ItemPoint[], limit = 5): TopItem[] {
  const groups = new Map<string, TopItem>();

  for (const item of items) {
    const key = normalizeLabel(item.label);
    if (!key) continue;

    const existing = groups.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      groups.set(key, { label: item.label, category: item.category, count: 1 });
    }
  }

  return [...groups.values()]
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "fr"))
    .slice(0, limit);
}

function normalizeLabel(label: string): string {
  return label
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

/** Répartition par catégorie, pour savoir ce que contient la garde-robe. */
export function countByCategory(items: ItemPoint[]): { category: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const item of items) {
    counts.set(item.category, (counts.get(item.category) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count);
}
