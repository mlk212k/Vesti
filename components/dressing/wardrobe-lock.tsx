import Link from "next/link";
import { buttonClasses } from "@/components/ui/button";
import { PLANS, requiredPlanFor } from "@/lib/plans";

/**
 * Le cadenas de la garde-robe.
 *
 * ── Ce qu'il montre, et ce qu'il ne montre pas ──────────────────────────────
 *
 * Il est posé SOUS les pièces, jamais à la place. C'est toute la différence
 * avec le mur de paiement qu'il remplace : celui-ci s'affichait à la place de
 * l'onglet, donc on demandait de payer pour une garde-robe qu'on n'avait jamais
 * vue. Ici, on voit ses propres habits au-dessus, et le cadenas ne ferme que la
 * suite. C'est ce qu'on possède déjà qui donne envie d'en garder plus.
 *
 * Il annonce aussi le compte exact (7/12, puis 12/12). Un « limite atteinte »
 * sans chiffre laisse croire à une panne ; un compteur dit que le produit
 * fonctionne comme prévu, et combien il reste avant la porte.
 */
export function WardrobeLock({
  count,
  limit,
}: {
  count: number;
  limit: number;
}) {
  const full = count >= limit;
  const needed = requiredPlanFor("dressing");
  const remaining = Math.max(limit - count, 0);

  return (
    <section
      className={`flex flex-col gap-3 rounded-[var(--radius-card)] border p-4 ${
        full ? "border-accent/30 bg-accent-soft" : "border-border-soft bg-surface"
      }`}
    >
      <div className="flex items-center gap-3">
        <span
          className={`flex h-9 w-9 flex-none items-center justify-center rounded-[var(--radius-control)] ${
            full ? "bg-accent text-accent-foreground" : "bg-surface-sunken text-muted"
          }`}
          aria-hidden
        >
          <LockIcon open={!full} />
        </span>
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="text-sm font-semibold">
            {full ? "Ta garde-robe est pleine" : "Garde-robe du plan Découverte"}
          </span>
          <span className="text-xs tabular-nums text-muted">
            {count} / {limit} pièces
          </span>
        </div>
      </div>

      {/* Une jauge, pas un simple texte : on voit la porte approcher avant de
          s'y cogner. Elle passe au violet plein une fois pleine. */}
      <div
        className="h-2 w-full overflow-hidden rounded-full bg-surface-sunken"
        role="meter"
        aria-valuenow={count}
        aria-valuemin={0}
        aria-valuemax={limit}
        aria-label="Pièces enregistrées sur la limite du plan"
      >
        <div
          className={`h-full rounded-full transition-[width] duration-500 ${
            full ? "bg-accent" : "bg-highlight"
          }`}
          style={{ width: `${Math.min((count / limit) * 100, 100)}%` }}
        />
      </div>

      <p className="text-xs leading-relaxed text-muted">
        {full
          ? `Les prochaines pièces analysées ne seront plus gardées. Le plan ${PLANS[needed].name} enlève la limite, et débloque le scan de ta penderie entière.`
          : `Encore ${remaining} pièce${remaining > 1 ? "s" : ""} avant la limite. Le plan ${PLANS[needed].name} l'enlève.`}
      </p>

      <Link href="/billing" className={buttonClasses(full ? "primary" : "secondary")}>
        Passer en {PLANS[needed].name}
      </Link>
    </section>
  );
}

/**
 * Cadenas ouvert tant qu'il reste de la place, fermé une fois pleine — c'est
 * l'anse qui bouge, le corps ne change pas. Le même dessin qui se ferme se lit
 * comme une conséquence ; deux dessins différents se liraient comme deux états
 * sans rapport.
 */
function LockIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="4.5" y="10.5" width="15" height="10" rx="2.6" />
      <path d={open ? "M8.4 10.5V7.6a3.6 3.6 0 0 1 7.2 0" : "M8.4 10.5V7.6a3.6 3.6 0 0 1 7.2 0v2.9"} />
    </svg>
  );
}
