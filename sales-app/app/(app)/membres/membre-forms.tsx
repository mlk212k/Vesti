"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { Alerte } from "@/components/alerte";
import { Submit } from "@/components/submit";
import type { ActionResult } from "@/lib/errors";
import { ROLE_LABEL, type Profile } from "@/lib/types";
import { usePanneau } from "@/lib/use-panneau";
import {
  createMemberAction,
  resetMemberPasswordAction,
  updateMemberAction,
} from "./actions";

// Génère un mot de passe provisoire lisible à voix haute au téléphone :
// pas de I/l/O/0 qui se confondent, quatre groupes de quatre.
function motDePasseProvisoire(): string {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const octets = crypto.getRandomValues(new Uint8Array(16));
  const lettres = [...octets].map((n) => alphabet[n % alphabet.length]);
  return [0, 4, 8, 12].map((i) => lettres.slice(i, i + 4).join("")).join("-");
}

export function CreateMemberForm() {
  const router = useRouter();
  const [state, action] = useActionState<ActionResult | undefined, FormData>(
    createMemberAction,
    undefined,
  );
  const [motDePasse, setMotDePasse] = useState("");
  const [ouvert, setOuvert] = usePanneau(state);

  useEffect(() => {
    if (state?.ok) router.refresh();
  }, [state, router]);

  if (!ouvert) {
    return (
      <button
        type="button"
        onClick={() => {
          setMotDePasse(motDePasseProvisoire());
          setOuvert(true);
        }}
        className="btn btn-primaire w-full py-3"
      >
        Créer un compte
      </button>
    );
  }

  return (
    <form action={action} className="panneau space-y-4 p-5">
      <h3 className="titre text-lg">Nouveau compte</h3>

      <div>
        <label className="libelle" htmlFor="full_name">
          Nom complet
        </label>
        <input id="full_name" name="full_name" required className="champ" />
      </div>

      <div>
        <label className="libelle" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoCapitalize="none"
          className="champ"
        />
      </div>

      <div>
        <label className="libelle" htmlFor="password">
          Mot de passe provisoire
        </label>
        <div className="flex gap-2">
          <input
            id="password"
            name="password"
            required
            minLength={8}
            value={motDePasse}
            onChange={(event) => setMotDePasse(event.target.value)}
            className="champ font-mono"
          />
          <button
            type="button"
            onClick={() => setMotDePasse(motDePasseProvisoire())}
            className="btn shrink-0 px-3 text-xs"
          >
            Regénérer
          </button>
        </div>
        <p className="mt-1.5 text-xs text-faint">
          Note-le : il ne sera plus jamais affiché. La personne pourra le
          changer depuis son profil.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="libelle" htmlFor="role">
            Rôle
          </label>
          <select id="role" name="role" defaultValue="member" className="champ">
            {Object.entries(ROLE_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="libelle" htmlFor="daily_goal_override">
            Objectif perso
          </label>
          <input
            id="daily_goal_override"
            name="daily_goal_override"
            type="number"
            min={1}
            className="champ"
            placeholder="par défaut"
          />
        </div>
      </div>

      <div>
        <label className="libelle" htmlFor="phone">
          Téléphone
        </label>
        <input id="phone" name="phone" type="tel" className="champ" />
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
        <Submit className="btn btn-primaire flex-[2] py-3" pendingLabel="Création…">
          Créer le compte
        </Submit>
      </div>
    </form>
  );
}

export function EditMemberForm({
  profile,
  estMoi,
}: {
  profile: Profile;
  estMoi: boolean;
}) {
  const router = useRouter();
  const [state, action] = useActionState<ActionResult | undefined, FormData>(
    updateMemberAction,
    undefined,
  );
  const [ouvert, setOuvert] = usePanneau(state);
  const [reset, resetAction] = useActionState<ActionResult | undefined, FormData>(
    resetMemberPasswordAction,
    undefined,
  );
  const [nouveau, setNouveau] = useState("");

  useEffect(() => {
    if (state?.ok) router.refresh();
  }, [state, router]);

  if (!ouvert) {
    return (
      <button
        type="button"
        onClick={() => setOuvert(true)}
        className="btn btn-fantome w-full py-2 text-xs"
      >
        Modifier
      </button>
    );
  }

  return (
    <div className="mt-3 space-y-4 border-t border-trait pt-4">
      <form action={action} className="space-y-3">
        <input type="hidden" name="member_id" value={profile.id} />

        <div>
          <label className="libelle" htmlFor={`name-${profile.id}`}>
            Nom
          </label>
          <input
            id={`name-${profile.id}`}
            name="full_name"
            required
            defaultValue={profile.full_name}
            className="champ"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="libelle" htmlFor={`role-${profile.id}`}>
              Rôle
            </label>
            <select
              id={`role-${profile.id}`}
              name="role"
              defaultValue={profile.role}
              className="champ"
            >
              {Object.entries(ROLE_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="libelle" htmlFor={`goal-${profile.id}`}>
              Objectif perso
            </label>
            <input
              id={`goal-${profile.id}`}
              name="daily_goal_override"
              type="number"
              min={1}
              defaultValue={profile.daily_goal_override ?? ""}
              className="champ"
              placeholder="par défaut"
            />
          </div>
        </div>

        <div>
          <label className="libelle" htmlFor={`phone-${profile.id}`}>
            Téléphone
          </label>
          <input
            id={`phone-${profile.id}`}
            name="phone"
            type="tel"
            defaultValue={profile.phone ?? ""}
            className="champ"
          />
        </div>

        <label className="flex items-center gap-2.5 text-sm text-dim">
          <input
            type="checkbox"
            name="is_active"
            defaultChecked={profile.is_active}
            disabled={estMoi}
            className="h-4 w-4 accent-[var(--braise)]"
          />
          Compte actif
          {estMoi ? (
            <span className="text-xs text-faint">(toi-même)</span>
          ) : null}
        </label>

        <p className="text-xs text-faint">
          Un compte désactivé ne peut plus se connecter, mais ses ventes et son
          historique restent intacts — on ne supprime jamais un commercial,
          sinon la comptabilité du mois partirait avec lui.
        </p>

        {state && !state.ok ? <Alerte>{state.error}</Alerte> : null}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setOuvert(false)}
            className="btn btn-fantome flex-1"
          >
            Fermer
          </button>
          <Submit className="btn btn-primaire flex-1 py-2.5 text-sm" pendingLabel="…">
            Enregistrer
          </Submit>
        </div>
      </form>

      <form action={resetAction} className="space-y-2 border-t border-trait pt-4">
        <input type="hidden" name="member_id" value={profile.id} />
        <label className="libelle" htmlFor={`pwd-${profile.id}`}>
          Réinitialiser le mot de passe
        </label>
        <div className="flex gap-2">
          <input
            id={`pwd-${profile.id}`}
            name="password"
            minLength={8}
            value={nouveau}
            onChange={(event) => setNouveau(event.target.value)}
            className="champ font-mono"
            placeholder="Nouveau mot de passe"
          />
          <Submit className="btn shrink-0 px-3 text-xs" pendingLabel="…">
            Appliquer
          </Submit>
        </div>
        {reset?.ok ? (
          <Alerte ton="succes">
            Mot de passe remplacé. Transmets-le de vive voix.
          </Alerte>
        ) : null}
        {reset && !reset.ok ? <Alerte>{reset.error}</Alerte> : null}
      </form>
    </div>
  );
}
