"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AvatarUploader } from "@/components/avatar-uploader";
import { NotificationOptIn } from "@/components/notification-opt-in";
import { CATEGORIES, categoryLabel, type Category } from "@/lib/categories";
import { setCategoryAction } from "./actions";

export function OnboardingWizard({
  userId,
  fullName,
  initialCategory,
}: {
  userId: string;
  fullName: string;
  initialCategory: string | null;
}) {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [category, setCategory] = useState<Category | null>(
    (initialCategory as Category) || null,
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleContinue() {
    if (!category) return;
    setSaving(true);
    setError(null);
    try {
      await setCategoryAction(category);
      setStep(2);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Une erreur est survenue");
    } finally {
      setSaving(false);
    }
  }

  if (step === 1) {
    return (
      <div className="space-y-6 text-center">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted">
            Étape 1 sur 3
          </p>
          <h1 className="mt-1 text-2xl font-semibold">Ta catégorie</h1>
          <p className="mt-1 text-sm text-muted">
            Dans quelle catégorie du club joues-tu ?
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              className={`clay-presse px-2 py-2.5 text-sm font-medium ${
                category === c
                  ? "clay ring-2 ring-accent/50 text-accent-strong"
                  : "clay-creux"
              }`}
            >
              {categoryLabel(c)}
            </button>
          ))}
        </div>

        {error && <p className="text-sm text-accent-strong">{error}</p>}

        <button
          type="button"
          onClick={handleContinue}
          disabled={!category || saving}
          className="clay-accent clay-presse w-full py-3 font-medium disabled:opacity-50"
        >
          {saving ? <span className="clay-caret">▌</span> : "Continuer"}
        </button>
      </div>
    );
  }

  if (step === 2) {
    return (
      <div className="space-y-6 text-center">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted">
            Étape 2 sur 3
          </p>
          <h1 className="mt-1 text-2xl font-semibold">Photo de profil</h1>
          <p className="mt-1 text-sm text-muted">
            Optionnel — tu pourras l&apos;ajouter plus tard depuis ton profil.
          </p>
        </div>

        <div className="flex justify-center">
          <AvatarUploader
            userId={userId}
            fullName={fullName}
            currentAvatarUrl={null}
          />
        </div>

        <button
          type="button"
          onClick={() => setStep(3)}
          className="clay-accent clay-presse w-full py-3 font-medium"
        >
          Continuer
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-center">
      <div>
        <p className="text-xs uppercase tracking-wide text-muted">
          Étape 3 sur 3
        </p>
        <h1 className="mt-1 text-2xl font-semibold">Notifications</h1>
        <p className="mt-1 text-sm text-muted">
          Active-les maintenant pour ne rater ni une convocation, ni un
          entraînement — tu pourras aussi le faire plus tard depuis ton
          profil.
        </p>
      </div>

      <NotificationOptIn />

      <button
        type="button"
        onClick={() => router.push("/dashboard")}
        className="clay-accent clay-presse w-full py-3 font-medium"
      >
        Terminer
      </button>
    </div>
  );
}
