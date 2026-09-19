"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { Alerte } from "@/components/alerte";
import { Submit } from "@/components/submit";
import type { ActionResult } from "@/lib/errors";
import { deleteBusinessAction } from "../actions";

// Suppression en deux temps. Un bouton rouge qui supprime au premier clic,
// sur mobile, dans une poche, c'est une fiche perdue par semaine.
export function BoutonSupprimer({ businessId }: { businessId: string }) {
  const router = useRouter();
  const [confirme, setConfirme] = useState(false);
  const [state, action] = useActionState<ActionResult | undefined, FormData>(
    deleteBusinessAction,
    undefined,
  );

  useEffect(() => {
    if (state?.ok) router.push("/commerces");
  }, [state, router]);

  if (!confirme) {
    return (
      <button
        type="button"
        onClick={() => setConfirme(true)}
        className="btn btn-fantome w-full text-faint"
      >
        Supprimer cette fiche
      </button>
    );
  }

  return (
    <div className="panneau space-y-3 p-4">
      <p className="text-sm text-dim">
        Supprimer la fiche&nbsp;? Les ventes déjà enregistrées sont conservées,
        elles perdent simplement leur rattachement à ce commerce.
      </p>
      {state && !state.ok ? <Alerte>{state.error}</Alerte> : null}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setConfirme(false)}
          className="btn btn-fantome flex-1"
        >
          Garder
        </button>
        <form action={action} className="flex-1">
          <input type="hidden" name="business_id" value={businessId} />
          <Submit className="btn btn-danger w-full" pendingLabel="…">
            Supprimer
          </Submit>
        </form>
      </div>
    </div>
  );
}
