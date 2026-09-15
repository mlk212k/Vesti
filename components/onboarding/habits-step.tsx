"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Gauge } from "@/components/onboarding/gauge";
import {
  EMPTY_HABITS,
  GAUGE_SCREENS,
  SCREEN_HEADINGS,
  questionFor,
  type HabitKey,
  type Habits,
} from "@/lib/habits";

/**
 * Les quatre écrans de jauges.
 *
 * ── Pourquoi des écrans et pas un formulaire ────────────────────────────────
 *
 * Ces cinq questions tiendraient sur une seule page. Mises ensemble, elles
 * deviendraient exactement ce qu'on essaie de ne pas faire : un questionnaire
 * qu'on descend au pouce en posant les curseurs au hasard pour atteindre le
 * bouton. Une question par écran coûte trois taps de plus et achète la seule
 * chose qui compte ici — qu'on lise la question avant d'y répondre.
 *
 * Le regroupement budget + part portée est la seule exception, et elle est
 * justifiée dans `GAUGE_SCREENS`.
 *
 * ⚠️ Aucune réponse n'est obligatoire. « Passer » est présent à chaque écran,
 * et une jauge qu'on n'a pas touchée part à `null` — voir `Gauge`. Un
 * onboarding qui bloque sur une question de budget perd la personne avant le
 * compte, et on n'a pas construit ces cinq questions pour ça.
 */
export function HabitsStep({
  onDone,
  onSkip,
  pending,
}: {
  onDone: (habits: Habits) => void;
  /** Quitte tout le questionnaire, sans rien enregistrer. */
  onSkip: () => void;
  pending: boolean;
}) {
  const [index, setIndex] = useState(0);
  const [habits, setHabits] = useState<Habits>(EMPTY_HABITS);

  const keys = GAUGE_SCREENS[index];
  const last = index === GAUGE_SCREENS.length - 1;
  const heading = SCREEN_HEADINGS[keys[0]];

  function answer(key: HabitKey, value: number) {
    setHabits((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <div className="flex flex-col gap-8">
      <Progress step={index} total={GAUGE_SCREENS.length} />

      {heading && <h1 className="text-[1.9rem] leading-[1.05]">{heading}</h1>}

      <div className="flex flex-col gap-10">
        {keys.map((key) => (
          <Question
            key={key}
            habitKey={key}
            value={habits[key]}
            onAnswer={(value) => answer(key, value)}
          />
        ))}
      </div>

      <div className="flex flex-col gap-2">
        <Button
          disabled={pending}
          onClick={() => (last ? onDone(habits) : setIndex(index + 1))}
        >
          {last ? (pending ? "Un instant…" : "Voir le résultat") : "Suivant"}
        </Button>

        {/* Revenir en arrière compte : on découvre en répondant à la question
            suivante qu'on a mal évalué la précédente. Sans retour, la seule
            façon de se corriger serait de recommencer l'inscription. */}
        {index > 0 ? (
          <Button variant="ghost" disabled={pending} onClick={() => setIndex(index - 1)}>
            Retour
          </Button>
        ) : (
          <Button variant="ghost" disabled={pending} onClick={onSkip}>
            Passer les questions
          </Button>
        )}
      </div>
    </div>
  );
}

function Question({
  habitKey,
  value,
  onAnswer,
}: {
  habitKey: HabitKey;
  value: number | null;
  onAnswer: (value: number) => void;
}) {
  const question = questionFor(habitKey);
  // L'id vient de la clé et non de `useId()` : il doit être stable d'un rendu à
  // l'autre puisque `aria-labelledby` du curseur le vise.
  const titleId = `gauge-${habitKey}`;

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h2 id={titleId} className="text-[1.45rem] leading-[1.15]">
          {question.title}
        </h2>
        <p className="text-sm leading-relaxed text-muted">{question.help}</p>
      </div>

      <Gauge
        value={value}
        onChange={onAnswer}
        bounds={question.bounds}
        start={question.start}
        step={question.step}
        format={question.format}
        ends={question.ends}
        labelledBy={titleId}
      />
    </section>
  );
}

/**
 * Où on en est.
 *
 * Quatre segments plutôt qu'une barre continue : on compte les écrans restants
 * d'un coup d'œil, ce qu'une barre remplie à 25 % ne dit pas. Le texte porte
 * l'information pour qui ne voit pas les segments ; les segments eux-mêmes sont
 * décoratifs et sortis de l'arbre d'accessibilité.
 */
function Progress({ step, total }: { step: number; total: number }) {
  return (
    <div className="flex flex-col gap-3">
      <span className="label text-muted">
        Question {step + 1} sur {total}
      </span>
      <div className="flex gap-1" aria-hidden>
        {Array.from({ length: total }, (_, i) => (
          <span
            key={i}
            className={`h-[3px] flex-1 rounded-full ${
              i <= step ? "bg-accent" : "bg-border-soft"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
