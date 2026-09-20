"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";
import { Alerte } from "@/components/alerte";
import { Submit } from "@/components/submit";
import type { ActionResult } from "@/lib/errors";
import { formatDateShort } from "@/lib/format";
import { formatCents } from "@/lib/money";
import type { CommissionPayout } from "@/lib/types";
import { createPayoutAction, markPayoutPaidAction } from "../actions";

// Règlement des commissions. Le montant n'est pas saisi : la fonction SQL le
// recalcule depuis les ventes de la période. Impossible de « se tromper » de
// 200 € en tapant trop vite.
export function CommissionPanel({
  memberId,
  payouts,
  debutMois,
  finMois,
}: {
  memberId: string;
  payouts: CommissionPayout[];
  debutMois: string;
  finMois: string;
}) {
  const router = useRouter();
  const [state, action] = useActionState<ActionResult | undefined, FormData>(
    createPayoutAction,
    undefined,
  );
  const [paid, paidAction] = useActionState<ActionResult | undefined, FormData>(
    markPayoutPaidAction,
    undefined,
  );

  useEffect(() => {
    if (state?.ok || paid?.ok) router.refresh();
  }, [state, paid, router]);

  return (
    <div className="panneau space-y-4 p-5">
      <div>
        <h3 className="titre text-lg">Commissions</h3>
        <p className="mt-1 text-xs text-faint">
          Fige la commission due sur une période, puis marque-la réglée quand
          l&apos;argent est encaissé.
        </p>
      </div>

      <form action={action} className="space-y-3">
        <input type="hidden" name="member_id" value={memberId} />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="libelle" htmlFor="period_start">
              Du
            </label>
            <input
              id="period_start"
              name="period_start"
              type="date"
              required
              defaultValue={debutMois}
              className="champ"
            />
          </div>
          <div>
            <label className="libelle" htmlFor="period_end">
              Au
            </label>
            <input
              id="period_end"
              name="period_end"
              type="date"
              required
              defaultValue={finMois}
              className="champ"
            />
          </div>
        </div>

        {state && !state.ok ? <Alerte>{state.error}</Alerte> : null}

        <Submit className="btn w-full py-2.5 text-sm" pendingLabel="…">
          Calculer la commission de la période
        </Submit>
      </form>

      {payouts.length > 0 ? (
        <ul className="space-y-2 border-t border-trait pt-4">
          {payouts.map((payout) => (
            <li
              key={payout.id}
              className="panneau-creux flex items-center gap-3 p-3"
            >
              <div className="min-w-0 flex-1">
                <p className="chiffre text-lg">
                  {formatCents(payout.amount_cents)}
                </p>
                <p className="text-[11px] text-faint">
                  {formatDateShort(payout.period_start)} →{" "}
                  {formatDateShort(payout.period_end)}
                </p>
              </div>

              {payout.status === "paid" ? (
                <span className="pastille pastille-vive">Réglée</span>
              ) : (
                <form action={paidAction}>
                  <input type="hidden" name="payout_id" value={payout.id} />
                  <Submit className="btn px-3 py-2 text-xs" pendingLabel="…">
                    Marquer réglée
                  </Submit>
                </form>
              )}
            </li>
          ))}
        </ul>
      ) : null}

      {paid && !paid.ok ? <Alerte>{paid.error}</Alerte> : null}
    </div>
  );
}
