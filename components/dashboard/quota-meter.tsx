/**
 * Quota du mois : un ratio unique face à une limite → un meter, pas un
 * graphique. La piste et le remplissage sont deux pas de la même rampe.
 */
export function QuotaMeter({
  used,
  limit,
  unlimited,
}: {
  used: number;
  limit: number;
  unlimited: boolean;
}) {
  const remaining = Math.max(limit - used, 0);
  const ratio = limit > 0 ? Math.min(used / limit, 1) : 0;
  const exhausted = remaining === 0;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <span className="text-[13px] font-semibold">
          {unlimited ? "Analyses ce mois-ci" : "Analyses restantes"}
        </span>
        <span className="font-display text-[13px] font-bold tabular-nums text-muted">
          {unlimited ? used : `${remaining} / ${limit}`}
        </span>
      </div>

      {/* Piste et remplissage : deux pas de la même rampe violette. */}
      <div
        className="h-2.5 w-full overflow-hidden rounded-full bg-accent-soft"
        role="meter"
        aria-valuenow={used}
        aria-valuemin={0}
        aria-valuemax={limit}
        aria-label="Analyses utilisées ce mois-ci"
      >
        <div
          className={`h-full rounded-full transition-[width] duration-500 ${
            exhausted ? "bg-danger" : "bg-highlight"
          }`}
          style={{ width: `${Math.max(ratio * 100, used > 0 ? 4 : 0)}%` }}
        />
      </div>
    </div>
  );
}
