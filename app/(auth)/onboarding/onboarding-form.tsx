"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { ChoiceChip, Field, Input } from "@/components/ui/field";
import { CommunityStep } from "@/components/onboarding/community-step";
import { HabitsStep } from "@/components/onboarding/habits-step";
import { HabitsSummary } from "@/components/onboarding/habits-summary";
import { PaywallStep } from "@/components/onboarding/paywall-step";
import { ReferralStep } from "@/components/onboarding/referral-step";
import { EMPTY_HABITS, type Habits } from "@/lib/habits";
import {
  GENDERS,
  HEIGHT_CM,
  MORPHOLOGIES,
  STYLES,
  WEIGHT_KG,
  parseMeasure,
  type Gender,
  type Morphology,
} from "@/lib/profile";
import {
  saveHabits,
  saveOnboarding,
  skipOnboarding,
  type OnboardingInput,
} from "./actions";

/**
 * Le parcours d'inscription, dans l'ordre.
 *
 * 1. `referral`  — le code de parrainage, capté avant tout le reste : c'est la
 *                  seule étape dont l'oubli coûte de l'argent à quelqu'un.
 * 2. `habits`    — les cinq jauges. Elles ne servent presque pas au produit ;
 *                  elles servent à ce que la personne calcule son problème.
 * 3. `summary`   — ses chiffres, multipliés et rendus.
 * 4. `profile`   — prénom, morphologie, styles : les renseignements.
 * 5. `paywall`   — l'offre, avec son chiffre à elle rappelé en face du prix.
 * 6. `community` — le Discord.
 *
 * ⚠️ L'ordre n'est pas arbitraire, et deux places en particulier :
 *
 * Les jauges passent AVANT le profil parce qu'elles sont faciles (un curseur)
 * et qu'elles donnent quelque chose en retour, là où le profil ne fait que
 * demander. Commencer par réclamer une taille et un poids, c'est ouvrir par le
 * moment le plus intrusif du parcours.
 *
 * Le paywall passe AVANT le Discord parce que l'étape communauté se termine par
 * un lien sortant : accepter l'invitation ouvre une autre application et ne
 * ramène pas ici. Placé après, le paywall ne serait jamais vu par les plus
 * motivés.
 *
 * Chaque étape enregistre ce qu'elle a collecté au moment où elle se termine :
 * fermer l'app entre deux écrans ne perd jamais l'écran précédent.
 */
type Step = "referral" | "habits" | "summary" | "profile" | "paywall" | "community";

export function OnboardingForm({ initialReferralCode }: { initialReferralCode: string }) {
  const [step, setStep] = useState<Step>("referral");
  const [habits, setHabits] = useState<Habits>(EMPTY_HABITS);
  const [firstName, setFirstName] = useState("");
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
        onDone={() => setStep("habits")}
      />
    );
  }

  if (step === "habits") {
    return (
      <HabitsStep
        pending={pending}
        // Passer les jauges saute AUSSI le récapitulatif : il n'aurait rien à
        // récapituler, et proposer un écran vide comme récompense d'un refus
        // serait insultant.
        onSkip={() => setStep("profile")}
        onDone={(answers) => {
          setHabits(answers);
          startTransition(async () => {
            // ⚠️ Le résultat n'est volontairement pas testé : l'écriture ne
            // débloque rien et n'ouvre aucun accès. Bloquer une inscription
            // sur son échec coûterait un compte pour cinq entiers.
            await saveHabits(answers);
            setStep("summary");
          });
        }}
      />
    );
  }

  if (step === "summary") {
    return <HabitsSummary habits={habits} onContinue={() => setStep("profile")} />;
  }

  if (step === "paywall") {
    return <PaywallStep habits={habits} onLater={() => setStep("community")} />;
  }

  // Dernière étape, atteinte que le formulaire ait été rempli ou passé. Le
  // profil est déjà enregistré ici : cet écran ne retient plus rien.
  if (step === "community") return <CommunityStep />;

  function toggleStyle(style: string) {
    setStyles((prev) =>
      prev.includes(style) ? prev.filter((s) => s !== style) : [...prev, style]
    );
  }

  function submit() {
    const parsedHeight = parseMeasure(height, HEIGHT_CM, "La taille");
    if (!parsedHeight.ok) return setError(parsedHeight.message);

    const parsedWeight = parseMeasure(weight, WEIGHT_KG, "Le poids");
    if (!parsedWeight.ok) return setError(parsedWeight.message);

    const input: OnboardingInput = {
      first_name: firstName.trim() === "" ? null : firstName.trim(),
      gender,
      height_cm: parsedHeight.value,
      weight_kg: parsedWeight.value,
      morphology,
      style_prefs: styles,
    };

    setError(null);
    startTransition(async () => {
      const result = await saveOnboarding(input);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setStep("paywall");
    });
  }

  return (
    <div className="flex flex-col gap-7">
      <div className="flex flex-col gap-2">
        <h1 className="text-[1.9rem] leading-[1.05]">Trois infos et on te connaît</h1>
        <p className="text-sm leading-relaxed text-muted">
          Tout est optionnel. Ça sert uniquement à rendre les conseils plus
          justes — jamais à te juger.
        </p>
      </div>

      {/* Le prénom d'abord : c'est la question la moins intrusive du
          formulaire, et commencer par elle rend la suite plus facile à
          accepter. `autoComplete` évite d'avoir à le taper. */}
      <Field label="Ton prénom">
        <Input
          autoComplete="given-name"
          autoCapitalize="words"
          maxLength={40}
          placeholder="Comment on t'appelle ?"
          value={firstName}
          onChange={(event) => setFirstName(event.target.value)}
        />
      </Field>

      <section className="flex flex-col gap-3">
        <h2 className="label text-muted">Tu t&apos;habilles plutôt en…</h2>
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
        <h2 className="label text-muted">Ta morphologie</h2>
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
        <h2 className="label text-muted">Les styles qui te parlent</h2>
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
          onClick={() =>
            startTransition(async () => {
              await skipOnboarding();
              // Passer le formulaire ne fait pas sauter l'offre : celui qui ne
              // veut pas donner sa morphologie peut très bien vouloir
              // s'abonner. Le paywall a sa propre sortie.
              setStep("paywall");
            })
          }
        >
          Passer cette étape
        </Button>
      </div>
    </div>
  );
}
