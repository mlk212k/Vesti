"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { ChoiceChip, Field, Input } from "@/components/ui/field";
import { ReferralStep } from "@/components/onboarding/referral-step";
import { saveOnboarding, skipOnboarding, type OnboardingInput } from "./actions";

const GENDERS = [
  { value: "femme", label: "Femme" },
  { value: "homme", label: "Homme" },
  { value: "non-binaire", label: "Non-binaire" },
  { value: "non-precise", label: "Je préfère ne pas dire" },
] as const;

const MORPHOLOGIES = [
  { value: "sablier", label: "Sablier" },
  { value: "triangle", label: "Triangle" },
  { value: "triangle-inverse", label: "Triangle inversé" },
  { value: "rectangle", label: "Rectangle" },
  { value: "ovale", label: "Ovale" },
  { value: "non-precise", label: "Je ne sais pas" },
] as const;

const STYLES = [
  "Minimaliste",
  "Streetwear",
  "Classique",
  "Bohème",
  "Sportif",
  "Vintage",
  "Casual",
  "Chic",
];

type Gender = (typeof GENDERS)[number]["value"];
type Morphology = (typeof MORPHOLOGIES)[number]["value"];

export function OnboardingForm({ initialReferralCode }: { initialReferralCode: string }) {
  const [step, setStep] = useState<"referral" | "profile">("referral");
  const [gender, setGender] = useState<Gender | null>(null);
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [morphology, setMorphology] = useState<Morphology | null>(null);
  const [styles, setStyles] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (step === "referral") {
    return (
      <ReferralStep
        initialCode={initialReferralCode}
        onDone={() => setStep("profile")}
      />
    );
  }

  function toggleStyle(style: string) {
    setStyles((prev) =>
      prev.includes(style) ? prev.filter((s) => s !== style) : [...prev, style]
    );
  }

  function parseOptionalNumber(
    value: string,
    min: number,
    max: number,
    label: string
  ): { ok: true; value: number | null } | { ok: false; message: string } {
    if (value.trim() === "") return { ok: true, value: null };
    const parsed = Number(value);
    if (Number.isNaN(parsed) || parsed < min || parsed > max) {
      return { ok: false, message: `${label} doit être compris entre ${min} et ${max}.` };
    }
    return { ok: true, value: Math.round(parsed) };
  }

  function submit() {
    const parsedHeight = parseOptionalNumber(height, 100, 250, "La taille");
    if (!parsedHeight.ok) return setError(parsedHeight.message);

    const parsedWeight = parseOptionalNumber(weight, 30, 300, "Le poids");
    if (!parsedWeight.ok) return setError(parsedWeight.message);

    const input: OnboardingInput = {
      gender,
      height_cm: parsedHeight.value,
      weight_kg: parsedWeight.value,
      morphology,
      style_prefs: styles,
    };

    setError(null);
    startTransition(async () => {
      const result = await saveOnboarding(input);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div className="flex flex-col gap-7">
      <div className="flex flex-col gap-2">
        <h1 className="text-[1.9rem] font-extrabold leading-[1.05]">Trois infos et on te connaît</h1>
        <p className="text-sm leading-relaxed text-muted">
          Tout est optionnel. Ça sert uniquement à rendre les conseils plus
          justes — jamais à te juger.
        </p>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold">Tu t&apos;habilles plutôt en…</h2>
        <div className="flex flex-wrap gap-2">
          {GENDERS.map((option) => (
            <ChoiceChip
              key={option.value}
              selected={gender === option.value}
              onClick={() => setGender(gender === option.value ? null : option.value)}
            >
              {option.label}
            </ChoiceChip>
          ))}
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3">
        <Field label="Ta taille" hint="en cm">
          <Input
            type="number"
            inputMode="numeric"
            min={100}
            max={250}
            placeholder="172"
            value={height}
            onChange={(e) => setHeight(e.target.value)}
          />
        </Field>
        <Field label="Ton poids" hint="en kg, facultatif">
          <Input
            type="number"
            inputMode="numeric"
            min={30}
            max={300}
            placeholder="—"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
          />
        </Field>
      </section>

      <p className="-mt-4 text-xs leading-relaxed text-muted">
        Taille et poids servent uniquement à ajuster les coupes et les
        proportions conseillées. Vesti ne commente jamais ton corps, et tu peux
        laisser ces champs vides.
      </p>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold">Ta morphologie</h2>
        <div className="flex flex-wrap gap-2">
          {MORPHOLOGIES.map((option) => (
            <ChoiceChip
              key={option.value}
              selected={morphology === option.value}
              onClick={() =>
                setMorphology(morphology === option.value ? null : option.value)
              }
            >
              {option.label}
            </ChoiceChip>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold">Les styles qui te parlent</h2>
        <div className="flex flex-wrap gap-2">
          {STYLES.map((style) => (
            <ChoiceChip
              key={style}
              selected={styles.includes(style)}
              onClick={() => toggleStyle(style)}
            >
              {style}
            </ChoiceChip>
          ))}
        </div>
      </section>

      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="flex flex-col gap-2">
        <Button onClick={submit} disabled={pending}>
          {pending ? "Enregistrement…" : "C'est parti"}
        </Button>
        <Button
          variant="ghost"
          disabled={pending}
          onClick={() => startTransition(() => skipOnboarding())}
        >
          Passer cette étape
        </Button>
      </div>
    </div>
  );
}
