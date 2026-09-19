// L'argent ne quitte jamais les centimes tant qu'il n'est pas affiché.
//
// Aucun calcul financier ne vit ici : le CA, la commission et le net sont
// calculés par Postgres (colonnes générées). Ce fichier ne fait que la
// traduction centimes <-> humain.

const EUR = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const EUR_COMPACT = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export function formatCents(cents: number): string {
  return EUR.format((cents ?? 0) / 100);
}

// Version sans centimes pour les grands chiffres des dashboards : « 400 € »
// se lit mieux que « 400,00 € » en gros titre.
export function formatCentsShort(cents: number): string {
  const value = cents ?? 0;
  if (value % 100 === 0) return EUR_COMPACT.format(value / 100);
  return EUR.format(value / 100);
}

// Saisie humaine -> centimes. Accepte « 50 », « 50,5 », « 50.50 », « 50 € ».
// Renvoie null si ce n'est pas un montant.
export function parseAmountToCents(input: string): number | null {
  const cleaned = input
    .replace(/\s| |€/g, "")
    .replace(",", ".")
    .trim();
  if (cleaned === "") return null;
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  const value = Number.parseFloat(cleaned);
  if (!Number.isFinite(value)) return null;
  return Math.round(value * 100);
}

// Points de base -> pourcentage lisible. 1000 -> « 10 % », 1250 -> « 12,5 % ».
export function formatRate(bp: number): string {
  const pct = bp / 100;
  return `${pct.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} %`;
}

export function percentOf(part: number, total: number): number {
  if (!total) return 0;
  return Math.round((part / total) * 100);
}
