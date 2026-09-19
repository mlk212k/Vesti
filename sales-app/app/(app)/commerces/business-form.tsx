"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";
import { Alerte } from "@/components/alerte";
import { PhotoUpload } from "@/components/photo-upload";
import { Submit } from "@/components/submit";
import type { ActionResult } from "@/lib/errors";
import { BUSINESS_STATUS_LABEL, type Business } from "@/lib/types";

type FormAction = (
  prev: ActionResult<string> | undefined,
  formData: FormData,
) => Promise<ActionResult<string>>;

// Un seul formulaire pour créer et pour modifier : l'action change, les
// champs non. Deux formulaires jumeaux finiraient par diverger au premier
// champ ajouté d'un côté seulement.
export function BusinessForm({
  action,
  business,
  userId,
  labelBouton,
  redirection,
}: {
  action: FormAction;
  business?: Business;
  userId: string;
  labelBouton: string;
  redirection?: string;
}) {
  const router = useRouter();
  const [state, formAction] = useActionState<
    ActionResult<string> | undefined,
    FormData
  >(action, undefined);

  useEffect(() => {
    if (state?.ok && redirection) router.push(redirection);
    else if (state?.ok) router.refresh();
  }, [state, router, redirection]);

  return (
    <form action={formAction} className="space-y-4">
      {business ? (
        <input type="hidden" name="business_id" value={business.id} />
      ) : null}

      <div>
        <label className="libelle" htmlFor="name">
          Nom du commerce *
        </label>
        <input
          id="name"
          name="name"
          required
          maxLength={160}
          className="champ"
          defaultValue={business?.name ?? ""}
          placeholder="Boulangerie du Marché"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="libelle" htmlFor="category">
            Type
          </label>
          <input
            id="category"
            name="category"
            className="champ"
            defaultValue={business?.category ?? ""}
            placeholder="Restaurant, coiffeur, garage…"
          />
        </div>

        <div>
          <label className="libelle" htmlFor="status">
            Statut
          </label>
          <select
            id="status"
            name="status"
            className="champ"
            defaultValue={business?.status ?? "prospect"}
          >
            {Object.entries(BUSINESS_STATUS_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="libelle" htmlFor="address">
          Adresse
        </label>
        <input
          id="address"
          name="address"
          className="champ"
          defaultValue={business?.address ?? ""}
          placeholder="12 rue des Lilas"
        />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2">
          <label className="libelle" htmlFor="city">
            Ville
          </label>
          <input
            id="city"
            name="city"
            className="champ"
            defaultValue={business?.city ?? ""}
          />
        </div>
        <div>
          <label className="libelle" htmlFor="postal_code">
            Code postal
          </label>
          <input
            id="postal_code"
            name="postal_code"
            inputMode="numeric"
            className="champ"
            defaultValue={business?.postal_code ?? ""}
          />
        </div>
      </div>

      <div>
        <label className="libelle" htmlFor="contact_name">
          Personne rencontrée
        </label>
        <input
          id="contact_name"
          name="contact_name"
          className="champ"
          defaultValue={business?.contact_name ?? ""}
          placeholder="Karim, le gérant"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="libelle" htmlFor="phone">
            Téléphone
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            inputMode="tel"
            className="champ"
            defaultValue={business?.phone ?? ""}
          />
        </div>
        <div>
          <label className="libelle" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            inputMode="email"
            autoCapitalize="none"
            className="champ"
            defaultValue={business?.email ?? ""}
          />
        </div>
      </div>

      <div>
        <label className="libelle" htmlFor="notes">
          Notes
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          className="champ resize-none"
          defaultValue={business?.notes ?? ""}
          placeholder="Déjà 40 avis Google, veut en avoir plus…"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="libelle" htmlFor="next_action">
            Prochaine action
          </label>
          <input
            id="next_action"
            name="next_action"
            className="champ"
            defaultValue={business?.next_action ?? ""}
            placeholder="Repasser avec 5 cartes"
          />
        </div>
        <div>
          <label className="libelle" htmlFor="next_action_at">
            Quand
          </label>
          <input
            id="next_action_at"
            name="next_action_at"
            type="date"
            className="champ"
            defaultValue={business?.next_action_at ?? ""}
          />
        </div>
      </div>

      <PhotoUpload userId={userId} label="Photo de la devanture" />

      {state && !state.ok ? <Alerte>{state.error}</Alerte> : null}
      {state?.ok && !redirection ? (
        <Alerte ton="succes">Fiche enregistrée.</Alerte>
      ) : null}

      <Submit className="btn btn-primaire w-full py-3.5" pendingLabel="Enregistrement…">
        {labelBouton}
      </Submit>
    </form>
  );
}
