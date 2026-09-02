import { PLANS, formatPrice, type Plan } from "@/lib/plans";

/**
 * Ce que la personne a MAINTENANT, avant qu'on lui propose autre chose.
 *
 * La page ne montrait que trois offres côte à côte, avec une mention « ton plan
 * actuel » perdue dedans. Or la première question de quelqu'un qui ouvre une
 * page d'abonnement n'est pas « que puis-je acheter » mais « où j'en suis » :
 * ce qui est actif, ce qui reste ce mois-ci, et jusqu'à quand.
 */
export function CurrentPlan({
  plan,
  used,
  limit,
  periodEnd,
  giftUntil,
}: {
  plan: Plan;
  used: number;
  limit: number;
  periodEnd: string | null;
  /**
   * Fin du plan offert, ou `null`. La page ne la transmet QUE si le cadeau est
   * encore valide : le composant ne rejuge pas la date, il l'affiche. Comparer
   * à l'heure courante pendant le rendu rendrait celui-ci impur, et surtout
   * dédoublerait une règle qui vit déjà dans `effective_plan`.
   */
  giftUntil: string | null;
}) {
  const definition = PLANS[plan];
  const remaining = Math.max(limit - used, 0);
  const ratio = limit > 0 ? Math.min(used / limit, 1) : 0;
  const gifted = giftUntil !== null;

  return (
    <section className="flex flex-col gap-4 rounded-[var(--radius-card)] border border-accent/30 bg-surface p-5 shadow-[var(--shadow-card)]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted">
            Ton plan
          </span>
          <span className="font-[family-name:var(--font-bricolage)] text-2xl font-extrabold leading-none">
            {definition.name}
          </span>
        </div>
        <span
          className={`flex-none rounded-full px-3 py-1 text-xs font-bold ${
            gifted
              ? "bg-accent-soft text-accent-strong"
              : plan === "free"
                ? "border border-border-soft text-muted"
                : "bg-success/12 text-success"
          }`}
        >
          {gifted ? "Offert" : plan === "free" ? "Gratuit" : formatPrice(plan)}
        </span>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between text-sm">
          <span className="font-semibold">
            {remaining} analyse{remaining > 1 ? "s" : ""} restante
            {remaining > 1 ? "s" : ""}
          </span>
          <span className="text-xs tabular-nums text-muted">
            {used} / {limit}
          </span>
        </div>

        <div
          className="h-2 w-full overflow-hidden rounded-full bg-surface-sunken"
          role="progressbar"
          aria-valuenow={used}
          aria-valuemin={0}
          aria-valuemax={limit}
          aria-label={`${used} analyses utilisées sur ${limit}`}
        >
          <div
            className={`h-full rounded-full transition-[width] duration-500 ${
              remaining === 0 ? "bg-danger" : "bg-accent"
            }`}
            style={{ width: `${Math.round(ratio * 100)}%` }}
          />
        </div>

        {periodEnd && (
          <span className="text-xs text-muted">
            Remis à zéro le{" "}
            {new Date(periodEnd).toLocaleDateString("fr-FR", {
              day: "numeric",
              month: "long",
            })}
          </span>
        )}
      </div>

      {gifted && (
        // La date compte : un plan offert qui s'arrête sans prévenir donne
        // l'impression d'une panne, pas d'une fin de cadeau.
        <p className="rounded-2xl bg-accent-soft px-4 py-3 text-xs leading-relaxed text-accent-strong">
          Offert jusqu&apos;au{" "}
          {new Date(giftUntil).toLocaleDateString("fr-FR", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
          . Rien ne te sera débité d&apos;ici là.
        </p>
      )}
    </section>
  );
}
