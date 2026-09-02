"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

/**
 * Le formulaire est une frontière : on valide tout ce qui arrive plutôt que de
 * faire confiance au client. Les valeurs doivent aussi correspondre aux
 * contraintes CHECK des migrations, sinon Postgres rejette l'update.
 */
const onboardingSchema = z.object({
  gender: z.enum(["femme", "homme", "non-binaire", "non-precise"]).nullable(),
  height_cm: z.number().int().min(100).max(250).nullable(),
  weight_kg: z.number().int().min(30).max(300).nullable(),
  morphology: z
    .enum(["sablier", "triangle", "triangle-inverse", "rectangle", "ovale", "non-precise"])
    .nullable(),
  style_prefs: z.array(z.string().min(1).max(40)).max(10),
});

export type OnboardingInput = z.infer<typeof onboardingSchema>;

export interface ReferralResult {
  accepted: boolean;
  reason: string | null;
}

/**
 * Enregistre le code. Passe par la fonction SQL : la colonne `referral_code`
 * n'est pas écrivable par le client et l'attribution est définitive côté base.
 *
 * La réponse est strictement binaire — à qui le code est rattaché ne sort
 * jamais du serveur.
 */
export async function submitReferralCode(code: string): Promise<ReferralResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data, error } = await supabase.rpc("redeem_referral_code", { p_code: code });

  if (error || !data) {
    return { accepted: false, reason: "error" };
  }

  const row = (data as { accepted: boolean; reason: string | null }[])[0];

  return {
    accepted: row?.accepted ?? false,
    reason: row?.reason ?? null,
  };
}

export async function saveOnboarding(input: OnboardingInput) {
  const parsed = onboardingSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "Certaines réponses sont invalides." as const };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      gender: parsed.data.gender,
      height_cm: parsed.data.height_cm,
      weight_kg: parsed.data.weight_kg,
      morphology: parsed.data.morphology,
      style_prefs: parsed.data.style_prefs,
      onboarded_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) {
    return { error: "Impossible d'enregistrer ton profil pour le moment." as const };
  }

  redirect("/dashboard");
}

/** « Passer » : on marque l'onboarding fait sans rien collecter. */
export async function skipOnboarding() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  await supabase
    .from("profiles")
    .update({ onboarded_at: new Date().toISOString() })
    .eq("id", user.id);

  redirect("/dashboard");
}
