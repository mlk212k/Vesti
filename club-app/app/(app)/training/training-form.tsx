"use client";

import { useActionState } from "react";
import { generateTrainingPlanAction, type PlanResult } from "./actions";

const SPECIFICITIES = [
  { value: "general", label: "Groupe entier" },
  { value: "gardiens", label: "Gardiens" },
  { value: "defenseurs", label: "Défenseurs" },
  { value: "milieux", label: "Milieux" },
  { value: "attaquants", label: "Attaquants" },
];

export function TrainingForm() {
  const [state, formAction, pending] = useActionState<
    PlanResult | undefined,
    FormData
  >(generateTrainingPlanAction, undefined);

  return (
    <div className="space-y-6">
      <form action={formAction} className="clay grid gap-3 p-4">
        <label className="space-y-1">
          <span className="text-xs text-muted">Équipe / catégorie</span>
          <input
            required
            name="team"
            placeholder="U15, Seniors A…"
            className="clay-creux w-full px-3 py-2.5"
          />
        </label>

        <label className="space-y-1">
          <span className="text-xs text-muted">Spécificité</span>
          <select
            name="specificity"
            defaultValue="general"
            className="clay-creux w-full px-3 py-2.5"
          >
            {SPECIFICITIES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="space-y-1">
            <span className="text-xs text-muted">Durée (minutes)</span>
            <input
              required
              type="number"
              name="duration"
              min={20}
              max={180}
              defaultValue={90}
              className="clay-creux w-full px-3 py-2.5"
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs text-muted">Effectif (optionnel)</span>
            <input
              type="number"
              name="playerCount"
              min={1}
              max={40}
              placeholder="16"
              className="clay-creux w-full px-3 py-2.5"
            />
          </label>
        </div>

        <label className="space-y-1">
          <span className="text-xs text-muted">Thème / objectif</span>
          <textarea
            required
            name="theme"
            rows={3}
            placeholder="Possession de balle, transitions défense-attaque, jeu dans les 30 derniers mètres…"
            className="clay-creux w-full px-3 py-2.5"
          />
        </label>

        {state && "error" in state && (
          <p className="rounded-2xl bg-accent/8 px-3 py-2.5 text-sm text-accent-strong ring-1 ring-accent/15">
            {state.error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="clay-accent clay-presse px-5 py-2.5 font-medium disabled:opacity-60"
        >
          {pending ? (
            <>
              Génération <span className="clay-caret">▌</span>
            </>
          ) : (
            "Générer la séance"
          )}
        </button>
      </form>

      {state && "plan" in state && <PlanOutput text={state.plan} />}
    </div>
  );
}

function PlanOutput({ text }: { text: string }) {
  return (
    <div className="clay space-y-2 p-4">
      {text.split("\n").map((line, i) => {
        const trimmed = line.trim();
        if (trimmed.startsWith("## ")) {
          return (
            <h2 key={i} className="pt-2 text-lg font-semibold first:pt-0">
              {trimmed.slice(3)}
            </h2>
          );
        }
        if (trimmed.startsWith("# ")) {
          return (
            <h1 key={i} className="text-xl font-semibold">
              {trimmed.slice(2)}
            </h1>
          );
        }
        if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
          return (
            <li key={i} className="ml-4 list-disc text-sm">
              {trimmed.slice(2)}
            </li>
          );
        }
        if (trimmed === "") return null;
        return (
          <p key={i} className="text-sm leading-relaxed">
            {trimmed}
          </p>
        );
      })}
    </div>
  );
}
