"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { profileSchema, type ProfileInput } from "@/lib/profile-schema";

export type OnboardingInput = ProfileInput;

export interface ReferralResult {
  accepted: boolean;
  reason: string | null;
}

type RedeemRow = { accepted: boolean; reason: string | null };

/**
 * Enregistre le code. Passe par les fonctions SQL : ni la colonne
 * `referral_code` ni `referred_by` ne sont écrivables par le client, et
 * l'attribution est définitive côté base.
 *
 * Un seul champ, deux familles de codes :
 *  - les codes de partenariat, créés à la main par l'éditeur (migration 0005) ;
 *  - les codes personnels des utilisateurs, qui rapportent du Style (0010).
 *
 * On essaie le premier, puis le second. Demander à l'utilisateur de choisir
 * lui-même la nature de son code serait lui faire porter une distinction
 * purement interne — celui qui a reçu un code sait seulement qu'il en a un.
 *
 * La réponse reste strictement binaire : à qui le code est rattaché ne sort
 * jamais du serveur.
 */
export async function submitReferralCode(code: string): Promise<ReferralResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const partner = await supabase.rpc("redeem_referral_code", { p_code: code });
  const partnerRow = (partner.data as RedeemRow[] | null)?.[0];

  if (partnerRow?.accepted) {
    return { accepted: true, reason: null };
  }

  // Code partenaire inconnu : c'est peut-être le code personnel d'un
  // utilisateur. Tout autre refus (déjà parrainé, code désactivé) est définitif
  // et ne gagne rien à être rejoué.
  if (partnerRow && partnerRow.reason !== "unknown_code") {
    return { accepted: false, reason: partnerRow.reason };
  }

  const style = await supabase.rpc("redeem_style_code", { p_code: code });
  const styleRow = (style.data as RedeemRow[] | null)?.[0];

  if (styleRow) {
    return { accepted: styleRow.accepted, reason: styleRow.reason };
  }

  if (partner.error && style.error) {
    return { accepted: false, reason: "error" };
  }

  return { accepted: false, reason: partnerRow?.reason ?? "unknown_code" };
}

export async function saveOnboarding(input: OnboardingInput) {
  const parsed = profileSchema.safeParse(input);
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
      first_name: parsed.data.first_name,
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

  // ⚠️ Plus de `redirect("/dashboard")` ici, et c'est volontaire : une dernière
  // étape suit — le Discord de la communauté. Rediriger depuis le serveur la
  // sauterait purement et simplement, sans erreur nulle part.
  //
  // Le profil EST enregistré à ce point : quoi qu'il arrive ensuite, y compris
  // si l'app est fermée sur l'écran suivant, le compte est complet.
  return { ok: true as const };
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

  // Passer le formulaire ne veut pas dire passer l'invitation : celui qui ne
  // veut pas donner sa morphologie peut très bien vouloir rejoindre le Discord.
  return { ok: true as const };
}
