"use client";

import { useState, useTransition } from "react";
import { updateProfile } from "@/app/(dashboard)/compte/actions";
import { Button } from "@/components/ui/button";
import { ChoiceChip, Field, Input } from "@/components/ui/field";
import {
  GENDERS,
  HEIGHT_CM,
  MAX_STYLES,
  MORPHOLOGIES,
  STYLES,
  WEIGHT_KG,
  parseMeasure,
  type Gender,
  type Morphology,
} from "@/lib/profile";

export interface ProfileValues {
  firstName: string;
  gender: Gender | null;
  heightCm: number | null;
  weightKg: number | null;
  morphology: Morphology | null;
  stylePrefs: string[];
}

type State =
  | { step: "idle" }
  | { step: "error"; message: string }
  | { step: "saved" };

/**
 * Le formulaire de profil, tel qu'on y revient — pas tel qu'on le découvre.
 *
 * ⚠️ Différence de fond avec l'inscription : ici les champs arrivent REMPLIS.
 * L'écran doit donc d'abord répondre à « qu'est-ce que j'avais mis ? », et
 * seulement ensuite permettre de changer. C'est pour ça qu'il n'y a ni étapes,
 * ni progression : tout est visible d'un coup et on modifie ce qu'on veut.
 *
 * L'enregistrement ne quitte pas la page. Renvoyer vers le sommaire après
 * chaque changement obligerait à rouvrir pour corriger la ligne d'à côté.
 */
export function ProfileForm({ initial }: { initial: ProfileValues }) {
  const [firstName, setFirstName] = useState(initial.firstName);
  const [gender, setGender] = useState<Gender | null>(initial.gender);
  const [height, setHeight] = useState(
    initial.heightCm ? String(initial.heightCm) : ""
  );
  const [weight, setWeight] = useState(
    initial.weightKg ? String(initial.weightKg) : ""
  );
  const [morphology, setMorphology] = useState<Morphology | null>(
    initial.morphology
  );
  const [styles, setStyles] = useState<string[]>(initial.stylePrefs);
  const [state, setState] = useState<State>({ step: "idle" });
  const [pending, startTransition] = useTransition();

  function toggleStyle(style: string) {
    setState({ step: "idle" });
    setStyles((prev) =>
      prev.includes(style)
        ? prev.filter((entry) => entry !== style)
        : // La borne vient de la colonne : au-delà, la base refuse l'écriture.
          prev.length >= MAX_STYLES
          ? prev
          : [...prev, style]
    );
  }

  function submit() {
    const parsedHeight = parseMeasure(height, HEIGHT_CM, "La taille");
    if (!parsedHeight.ok) {
      setState({ step: "error", message: parsedHeight.message });
      return;
    }

    const parsedWeight = parseMeasure(weight, WEIGHT_KG, "Le poids");
    if (!parsedWeight.ok) {
      setState({ step: "error", message: parsedWeight.message });
      return;
    }

    startTransition(async () => {
      const result = await updateProfile({
        first_name: firstName.trim() || null,
        gender,
        height_cm: parsedHeight.value,
        weight_kg: parsedWeight.value,
        morphology,
        style_prefs: styles,
      });

      setState(
        result.ok
          ? { step: "saved" }
          : { step: "error", message: result.message ?? "Enregistrement impossible." }
      );
    });
  }

  return (
    <form
      className="flex flex-col gap-7"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <Field label="Prénom" hint="Utilisé pour t'adresser la parole, rien d'autre.">
        <Input
          value={firstName}
          onChange={(event) => {
            setState({ step: "idle" });
            setFirstName(event.target.value);
          }}
          maxLength={40}
          autoComplete="given-name"
          placeholder="Ton prénom"
        />
      </Field>

      <Group
        label="Genre"
        hint="Change les coupes et les pièces conseillées."
      >
        {GENDERS.map((entry) => (
          <ChoiceChip
            key={entry.value}
            selected={gender === entry.value}
            onClick={() => {
              setState({ step: "idle" });
              // Retoucher le même choix l'annule : sans ça, un genre coché par
              // erreur ne peut plus jamais être décoché.
              setGender(gender === entry.value ? null : entry.value);
            }}
          >
            {entry.label}
          </ChoiceChip>
        ))}
      </Group>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Taille (cm)">
          <Input
            value={height}
            onChange={(event) => {
              setState({ step: "idle" });
              setHeight(event.target.value);
            }}
            // `inputMode` et non `type="number"` : les flèches et le défilement
            // à la molette d'un champ nombre modifient la valeur par accident,
            // et sur mobile seul le clavier compte — c'est lui qu'on choisit.
            inputMode="numeric"
            placeholder="—"
          />
        </Field>
        <Field label="Poids (kg)">
          <Input
            value={weight}
            onChange={(event) => {
              setState({ step: "idle" });
              setWeight(event.target.value);
            }}
            inputMode="numeric"
            placeholder="—"
          />
        </Field>
      </div>

      <Group
        label="Morphologie"
        hint="Le repère le plus utile pour juger une coupe. « Je ne sais pas » est une réponse valable."
      >
        {MORPHOLOGIES.map((entry) => (
          <ChoiceChip
            key={entry.value}
            selected={morphology === entry.value}
            onClick={() => {
              setState({ step: "idle" });
              setMorphology(morphology === entry.value ? null : entry.value);
            }}
          >
            {entry.label}
          </ChoiceChip>
        ))}
      </Group>

      <Group
        label="Styles que tu aimes"
        hint={`Autant que tu veux, jusqu'à ${MAX_STYLES}. C'est ce qui oriente les suggestions d'achat.`}
      >
        {STYLES.map((style) => (
          <ChoiceChip
            key={style}
            selected={styles.includes(style)}
            onClick={() => toggleStyle(style)}
          >
            {style}
          </ChoiceChip>
        ))}
      </Group>

      {state.step === "error" && (
        <p
          role="alert"
          className="rounded-[var(--radius-control)] border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger"
        >
          {state.message}
        </p>
      )}

      {state.step === "saved" && (
        <p
          role="status"
          className="rounded-[var(--radius-control)] border border-success/30 bg-success/5 px-4 py-3 text-sm text-success"
        >
          Enregistré. Tes prochaines analyses en tiennent compte.
        </p>
      )}

      <Button type="submit" disabled={pending}>
        {pending ? "Enregistrement…" : "Enregistrer"}
      </Button>
    </form>
  );
}

/** Un intitulé, son explication, et les puces en dessous. */
function Group({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-[13px] font-semibold tracking-[-0.01em]">
        {label}
      </legend>
      {hint && <p className="text-xs leading-relaxed text-muted">{hint}</p>}
      <div className="flex flex-wrap gap-2 pt-1">{children}</div>
    </fieldset>
  );
}
