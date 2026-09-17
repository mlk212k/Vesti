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
      <form
        action={formAction}
        className="grid gap-3 rounded-lg border border-border bg-surface p-4"
      >
        <label className="space-y-1">
          <span className="text-xs text-muted">Équipe / catégorie</span>
          <input
            required
            name="team"
            placeholder="U15, Seniors A…"
            className="w-full rounded border border-border bg-background px-3 py-2"
          />
        </label>

        <label className="space-y-1">
          <span className="text-xs text-muted">Spécificité</span>
          <select
            name="specificity"
            defaultValue="general"
            className="w-full rounded border border-border bg-background px-3 py-2"
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
              className="w-full rounded border border-border bg-background px-3 py-2"
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
              className="w-full rounded border border-border bg-background px-3 py-2"
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
            className="w-full rounded border border-border bg-background px-3 py-2"
          />
        </label>

        {state && "error" in state && (
          <p className="rounded-lg border border-accent/30 bg-accent/5 px-3 py-2 text-sm text-accent-strong">
            {state.error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="rounded bg-accent px-4 py-2 font-medium text-white hover:bg-accent-strong disabled:opacity-60"
        >
          {pending ? "Génération…" : "Générer la séance"}
        </button>
      </form>

      {state && "plan" in state && <PlanOutput text={state.plan} />}
    </div>
  );
}

function PlanOutput({ text }: { text: string }) {
  return (
    <div className="space-y-2 rounded-lg border border-border bg-surface p-4">
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
