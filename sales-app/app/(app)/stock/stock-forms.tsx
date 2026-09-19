"use client";

import { useActionState } from "react";
import { Alerte } from "@/components/alerte";
import { Submit } from "@/components/submit";
import type { ActionResult } from "@/lib/errors";
import type { Profile } from "@/lib/types";
import {
  adjustAction,
  allocateAction,
  lossAction,
  restockAction,
  returnAction,
} from "./actions";

type Action = (
  prev: ActionResult | undefined,
  formData: FormData,
) => Promise<ActionResult>;

function useForm(action: Action) {
  return useActionState<ActionResult | undefined, FormData>(action, undefined);
}

function Retour({ state, succes }: { state: ActionResult | undefined; succes: string }) {
  if (!state) return null;
  return state.ok ? (
    <Alerte ton="succes">{succes}</Alerte>
  ) : (
    <Alerte>{state.error}</Alerte>
  );
}

export function RestockForm() {
  const [state, action] = useForm(restockAction);

  return (
    <form action={action} className="panneau space-y-3 p-5">
      <h3 className="titre text-lg">Entrée de stock</h3>
      <p className="text-xs text-faint">
        Des cartes arrivent au dépôt : commande reçue, réassort.
      </p>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="libelle" htmlFor="restock-quantity">
            Quantité
          </label>
          <input
            id="restock-quantity"
            name="quantity"
            type="number"
            min={1}
            required
            className="champ chiffre text-xl"
            placeholder="500"
          />
        </div>
        <div>
          <label className="libelle" htmlFor="restock-cost">
            Coût unitaire
          </label>
          <input
            id="restock-cost"
            name="unit_cost"
            inputMode="decimal"
            className="champ"
            placeholder="facultatif"
          />
        </div>
      </div>

      <div>
        <label className="libelle" htmlFor="restock-label">
          Libellé
        </label>
        <input
          id="restock-label"
          name="label"
          className="champ"
          placeholder="Commande mars"
        />
      </div>

      <Retour state={state} succes="Stock mis à jour." />
      <Submit className="btn btn-primaire w-full py-3" pendingLabel="…">
        Ajouter au dépôt
      </Submit>
    </form>
  );
}

export function AllocateForm({ membres }: { membres: Profile[] }) {
  const [state, action] = useForm(allocateAction);

  return (
    <form action={action} className="panneau space-y-3 p-5">
      <h3 className="titre text-lg">Attribuer des cartes</h3>
      <p className="text-xs text-faint">
        Le dépôt baisse, le commercial les a en main. Il reçoit une notification.
      </p>

      <div>
        <label className="libelle" htmlFor="allocate-member">
          Commercial
        </label>
        <select id="allocate-member" name="member_id" required className="champ">
          {membres.map((membre) => (
            <option key={membre.id} value={membre.id}>
              {membre.full_name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="libelle" htmlFor="allocate-quantity">
            Quantité
          </label>
          <input
            id="allocate-quantity"
            name="quantity"
            type="number"
            min={1}
            required
            defaultValue={10}
            className="champ chiffre text-xl"
          />
        </div>
        <div>
          <label className="libelle" htmlFor="allocate-note">
            Note
          </label>
          <input
            id="allocate-note"
            name="note"
            className="champ"
            placeholder="facultatif"
          />
        </div>
      </div>

      <Retour state={state} succes="Cartes attribuées." />
      <Submit className="btn btn-primaire w-full py-3" pendingLabel="…">
        Attribuer
      </Submit>
    </form>
  );
}

export function ReturnForm({ membres }: { membres: Profile[] }) {
  const [retour, retourAction] = useForm(returnAction);
  const [perte, perteAction] = useForm(lossAction);

  return (
    <div className="panneau space-y-5 p-5">
      <div>
        <h3 className="titre text-lg">Retours et pertes</h3>
        <p className="mt-1 text-xs text-faint">
          Un retour remet les cartes au dépôt. Une perte les sort du circuit
          sans y revenir — les comptes restent justes dans les deux cas.
        </p>
      </div>

      <form action={retourAction} className="space-y-3">
        <div className="grid grid-cols-[1fr_auto] gap-3">
          <select name="member_id" required className="champ" aria-label="Commercial">
            {membres.map((membre) => (
              <option key={membre.id} value={membre.id}>
                {membre.full_name}
              </option>
            ))}
          </select>
          <input
            name="quantity"
            type="number"
            min={1}
            required
            className="champ chiffre w-24 text-center"
            placeholder="0"
            aria-label="Quantité retournée"
          />
        </div>
        <input name="note" className="champ" placeholder="Note (facultatif)" />
        <Retour state={retour} succes="Retour enregistré." />
        <Submit className="btn w-full" pendingLabel="…">
          Retour au dépôt
        </Submit>
      </form>

      <form action={perteAction} className="space-y-3 border-t border-line pt-5">
        <div className="grid grid-cols-[1fr_auto] gap-3">
          <select name="member_id" required className="champ" aria-label="Commercial">
            {membres.map((membre) => (
              <option key={membre.id} value={membre.id}>
                {membre.full_name}
              </option>
            ))}
          </select>
          <input
            name="quantity"
            type="number"
            min={1}
            required
            className="champ chiffre w-24 text-center"
            placeholder="0"
            aria-label="Quantité perdue"
          />
        </div>
        <input name="note" className="champ" placeholder="Circonstances" />
        <Retour state={perte} succes="Perte enregistrée." />
        <Submit className="btn btn-fantome w-full" pendingLabel="…">
          Déclarer une perte
        </Submit>
      </form>
    </div>
  );
}

export function AdjustForm() {
  const [state, action] = useForm(adjustAction);

  return (
    <form action={action} className="panneau space-y-3 p-5">
      <h3 className="titre text-lg">Recomptage du dépôt</h3>
      <p className="text-xs text-faint">
        Écart constaté entre le carton et l&apos;application. Positif si on en
        trouve plus que prévu, négatif sinon. La justification est obligatoire.
      </p>

      <div className="grid grid-cols-[auto_1fr] gap-3">
        <input
          name="delta"
          type="number"
          required
          className="champ chiffre w-28 text-center text-xl"
          placeholder="-3"
          aria-label="Écart"
        />
        <input
          name="note"
          required
          className="champ"
          placeholder="Carton abîmé au transport"
          aria-label="Justification"
        />
      </div>

      <Retour state={state} succes="Correction enregistrée." />
      <Submit className="btn btn-fantome w-full" pendingLabel="…">
        Corriger l&apos;inventaire
      </Submit>
    </form>
  );
}
