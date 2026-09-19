"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { Alerte } from "@/components/alerte";
import { Submit } from "@/components/submit";
import type { ActionResult } from "@/lib/errors";
import { formatCents, parseAmountToCents } from "@/lib/money";
import type { Business, Sale } from "@/lib/types";
import { usePanneau } from "@/lib/use-panneau";
import { deleteSaleAction, updateSaleAction } from "../actions";

export function EditSale({
  sale,
  businesses,
  peutSupprimer,
}: {
  sale: Sale;
  businesses: Business[];
  peutSupprimer: boolean;
}) {
  const router = useRouter();
  const [state, action] = useActionState<ActionResult | undefined, FormData>(
    updateSaleAction,
    undefined,
  );
  const [ouvert, setOuvert] = usePanneau(state);
  const [suppression, deleteAction] = useActionState<
    ActionResult | undefined,
    FormData
  >(deleteSaleAction, undefined);

  const [quantite, setQuantite] = useState(sale.quantity);
  const [prix, setPrix] = useState((sale.unit_price_cents / 100).toString());

  useEffect(() => {
    if (state?.ok) router.refresh();
  }, [state, router]);

  useEffect(() => {
    if (suppression?.ok) router.push("/ventes");
  }, [suppression, router]);

  const total = (parseAmountToCents(prix) ?? 0) * quantite;

  if (!ouvert) {
    return (
      <div className="space-y-3">
        <button
          type="button"
          onClick={() => setOuvert(true)}
          className="btn w-full py-3"
        >
          Corriger cette vente
        </button>

        {peutSupprimer ? (
          <form action={deleteAction}>
            <input type="hidden" name="sale_id" value={sale.id} />
            <Submit className="btn btn-danger w-full py-3" pendingLabel="Suppression…">
              Annuler la vente
            </Submit>
          </form>
        ) : null}

        {suppression && !suppression.ok ? (
          <Alerte>{suppression.error}</Alerte>
        ) : null}
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="sale_id" value={sale.id} />

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="libelle" htmlFor="quantity">
            Cartes
          </label>
          <input
            id="quantity"
            name="quantity"
            type="number"
            min={1}
            max={1000}
            value={quantite}
            onChange={(event) => setQuantite(Number(event.target.value) || 1)}
            className="champ chiffre text-center text-xl"
          />
        </div>
        <div>
          <label className="libelle" htmlFor="unit_price">
            Prix unitaire
          </label>
          <input
            id="unit_price"
            name="unit_price"
            inputMode="decimal"
            value={prix}
            onChange={(event) => setPrix(event.target.value)}
            className="champ text-xl"
          />
        </div>
      </div>

      <p className="text-sm text-dim">
        Nouveau montant : <span className="chiffre">{formatCents(total)}</span>
        <span className="text-faint">
          {" "}
          · le taux de commission d&apos;origine ({(sale.commission_rate_bp / 100).toLocaleString("fr-FR")}
          {" %"}) reste appliqué
        </span>
      </p>

      <div>
        <label className="libelle" htmlFor="business_id">
          Commerce
        </label>
        <select
          id="business_id"
          name="business_id"
          className="champ"
          defaultValue={sale.business_id ?? ""}
        >
          <option value="">— Aucun —</option>
          {businesses.map((business) => (
            <option key={business.id} value={business.id}>
              {business.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="libelle" htmlFor="notes">
          Notes
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={2}
          className="champ resize-none"
          defaultValue={sale.notes ?? ""}
        />
      </div>

      {state && !state.ok ? <Alerte>{state.error}</Alerte> : null}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setOuvert(false)}
          className="btn btn-fantome flex-1"
        >
          Annuler
        </button>
        <Submit className="btn btn-primaire flex-[2] py-3" pendingLabel="…">
          Enregistrer
        </Submit>
      </div>

      <p className="text-xs text-faint">
        La correction laisse une trace : l&apos;ancien et le nouveau montant sont
        écrits dans le journal d&apos;audit, et le stock est ajusté par un
        mouvement de correction.
      </p>
    </form>
  );
}
