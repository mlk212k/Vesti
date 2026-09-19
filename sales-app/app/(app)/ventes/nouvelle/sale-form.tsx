"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { Alerte } from "@/components/alerte";
import { IconPlus } from "@/components/icons";
import { PhotoUpload } from "@/components/photo-upload";
import { Submit } from "@/components/submit";
import type { ActionResult } from "@/lib/errors";
import { formatCents, parseAmountToCents } from "@/lib/money";
import type { Business } from "@/lib/types";
import { createSaleAction } from "../actions";

// Le formulaire de vente est l'écran le plus utilisé de l'app, debout, sur un
// trottoir, d'une main. D'où : gros pas de quantité, prix pré-rempli,
// aperçu du total en direct, et un seul bouton en bas.
//
// L'aperçu est un CONFORT, pas un calcul : le montant réellement enregistré
// est celui que Postgres recalcule (colonnes générées de `sales`).
export function SaleForm({
  businesses,
  defaultPriceCents,
  commissionRateBp,
  cardsHeld,
  userId,
}: {
  businesses: Business[];
  defaultPriceCents: number;
  commissionRateBp: number;
  cardsHeld: number;
  userId: string;
}) {
  const router = useRouter();
  const [state, action] = useActionState<ActionResult | undefined, FormData>(
    createSaleAction,
    undefined,
  );

  const [quantite, setQuantite] = useState(1);
  const [prix, setPrix] = useState(() => (defaultPriceCents / 100).toString());

  useEffect(() => {
    if (state?.ok) router.push("/ventes?enregistree=1");
  }, [state, router]);

  const prixCents = parseAmountToCents(prix) ?? 0;
  const totalCents = prixCents * quantite;
  const commissionCents = Math.round((totalCents * commissionRateBp) / 10000);
  const netCents = totalCents - commissionCents;

  const trop = quantite > cardsHeld;

  return (
    <form action={action} className="space-y-5">
      <div>
        <span className="libelle">Nombre de cartes</span>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setQuantite((q) => Math.max(1, q - 1))}
            className="btn h-14 w-14 shrink-0 text-2xl"
            aria-label="Une carte de moins"
          >
            −
          </button>
          <input
            name="quantity"
            type="number"
            inputMode="numeric"
            min={1}
            max={1000}
            value={quantite}
            onChange={(event) =>
              setQuantite(Math.max(1, Number(event.target.value) || 1))
            }
            className="champ chiffre h-14 flex-1 text-center text-3xl"
            aria-label="Nombre de cartes vendues"
          />
          <button
            type="button"
            onClick={() => setQuantite((q) => Math.min(1000, q + 1))}
            className="btn h-14 w-14 shrink-0 text-2xl"
            aria-label="Une carte de plus"
          >
            +
          </button>
        </div>
        <p className={`mt-1.5 text-xs ${trop ? "text-[#ff9b9b]" : "text-faint"}`}>
          {trop
            ? `Tu n'as que ${cardsHeld} carte${cardsHeld > 1 ? "s" : ""} en main.`
            : `${cardsHeld} carte${cardsHeld > 1 ? "s" : ""} en main`}
        </p>
      </div>

      <div>
        <label className="libelle" htmlFor="unit_price">
          Prix unitaire
        </label>
        <div className="relative">
          <input
            id="unit_price"
            name="unit_price"
            inputMode="decimal"
            value={prix}
            onChange={(event) => setPrix(event.target.value)}
            className="champ pr-9 text-lg"
            placeholder="50"
          />
          <span className="absolute top-1/2 right-3.5 -translate-y-1/2 text-dim">
            €
          </span>
        </div>
      </div>

      {/* Récapitulatif : c'est exactement ce que la base va calculer. */}
      <div className="panneau-creux grid grid-cols-3 gap-2 p-4">
        <div>
          <p className="surtitre-serre">Montant</p>
          <p className="chiffre mt-1 text-xl">{formatCents(totalCents)}</p>
        </div>
        <div>
          <p className="surtitre-serre">Commission</p>
          <p className="chiffre mt-1 text-xl text-faint">
            {formatCents(commissionCents)}
          </p>
        </div>
        <div>
          <p className="surtitre-serre">Mon net</p>
          <p className="chiffre mt-1 bg-gradient-to-br from-[#c4b5fd] to-[#ff8ec0] bg-clip-text text-xl text-transparent">
            {formatCents(netCents)}
          </p>
        </div>
      </div>

      <div>
        <label className="libelle" htmlFor="business_id">
          Commerce
        </label>
        <select id="business_id" name="business_id" className="champ" defaultValue="">
          <option value="">— Aucun / vente directe —</option>
          {businesses.map((business) => (
            <option key={business.id} value={business.id}>
              {business.name}
              {business.city ? ` · ${business.city}` : ""}
            </option>
          ))}
        </select>
        <Link
          href="/commerces/nouveau"
          className="mt-2 inline-flex items-center gap-1.5 text-xs text-faint hover:text-dim"
        >
          <IconPlus className="h-3.5 w-3.5" />
          Créer une fiche commerce
        </Link>
      </div>

      <div>
        <label className="libelle" htmlFor="notes">
          Notes
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={2}
          maxLength={2000}
          className="champ resize-none"
          placeholder="Gérant intéressé par 5 de plus la semaine prochaine…"
        />
      </div>

      <PhotoUpload userId={userId} />

      {state && !state.ok ? <Alerte>{state.error}</Alerte> : null}

      <Submit
        className="btn btn-primaire w-full py-4 text-base"
        pendingLabel="Enregistrement…"
      >
        Enregistrer la vente
      </Submit>
    </form>
  );
}
