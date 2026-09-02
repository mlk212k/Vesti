import type { TopItem } from "@/lib/stats";

/**
 * Pièces qui reviennent le plus dans les tenues analysées.
 *
 * Une seule série : toutes les barres portent la même teinte. Les foncer selon
 * la valeur doublerait l'encodage déjà porté par la longueur, sans rien ajouter.
 */
export function TopItems({ items }: { items: TopItem[] }) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-muted">
        Analyse quelques tenues pour voir ce que tu portes le plus.
      </p>
    );
  }

  const max = Math.max(...items.map((item) => item.count));

  return (
    <ul className="flex flex-col gap-2.5">
      {items.map((item) => (
        <li key={`${item.category}-${item.label}`} className="flex flex-col gap-1">
          <div className="flex items-baseline justify-between gap-3">
            <span className="truncate text-sm">{item.label}</span>
            <span className="flex-none text-xs tabular-nums text-muted">
              {item.count}×
            </span>
          </div>
          <div className="h-2.5 w-full">
            <div
              // Extrémité arrondie côté données, carrée à la ligne de base.
              className="h-full rounded-r-[4px] bg-highlight"
              style={{ width: `${Math.max((item.count / max) * 100, 6)}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
