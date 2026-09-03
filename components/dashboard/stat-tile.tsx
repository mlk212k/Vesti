import type { ReactNode } from "react";

/**
 * Une valeur isolée se lit mieux en tuile qu'en graphique à une barre.
 * Contrat : libellé en casse de phrase, valeur en gros, delta optionnel.
 */
export function StatTile({
  label,
  value,
  delta,
  suffix,
}: {
  label: string;
  value: ReactNode;
  /** Variation par rapport à la période précédente, déjà arrondie. */
  delta?: number | null;
  suffix?: string;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-[var(--radius-card)] border border-border-soft bg-surface p-4">
      <span className="text-xs font-medium text-muted">{label}</span>
      <span className="flex items-baseline gap-1">
        <span className="font-display text-[28px] font-extrabold leading-none tracking-[-0.03em] tabular-nums">
          {value}
        </span>
        {suffix && <span className="text-xs text-muted">{suffix}</span>}
      </span>
      {delta !== undefined && delta !== null && delta !== 0 && (
        <span
          className={`text-xs font-medium ${delta > 0 ? "text-success" : "text-muted"}`}
        >
          {delta > 0 ? "+" : ""}
          {delta} pts vs avant
        </span>
      )}
    </div>
  );
}
