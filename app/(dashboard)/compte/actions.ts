"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { profileSchema, type ProfileInput } from "@/lib/profile-schema";

export interface CodeResult {
  accepted: boolean;
  reason: string | null;
}

/**
 * Saisir le code d'un parrain depuis les réglages.
 *
 * L'étape d'onboarding est passable, et l'attribution est définitive : sans ce
 * second point d'entrée, celui qui a passé l'étape puis reçu un code d'un ami
 * n'a plus aucun moyen de l'utiliser. Le refus reste géré en base
 * (déjà parrainé, code inconnu, son propre code).
 */
export async function submitStyleCode(code: string): Promise<CodeResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data, error } = await supabase.rpc("redeem_style_code", { p_code: code });

  if (error || !data) {
    return { accepted: false, reason: "error" };
  }

  const row = (data as CodeResult[])[0];

  if (row?.accepted) {
    revalidatePath("/compte");
  }

  return { accepted: row?.accepted ?? false, reason: row?.reason ?? null };
}

export interface GiftResult {
  accepted: boolean;
  reason: string | null;
  until: string | null;
}

/**
 * Échange les Style contre six mois de Styliste.
 *
 * Tout se décide en base : le seuil, le débit et la date de fin sont appliqués
 * par `redeem_style_gift()` sous un verrou de ligne. Cette action ne fait que
 * relayer — un contrôle du solde écrit ici ne serait qu'un doublon contournable.
 */
export async function redeemStyleGift(): Promise<GiftResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data, error } = await supabase.rpc("redeem_style_gift");

  if (error || !data) {
    return { accepted: false, reason: "error", until: null };
  }

  const row = (data as GiftResult[])[0];

  // Le plan effectif change : les pages qui affichent le quota ou le plan
  // montreraient encore l'ancien sans ça.
  if (row?.accepted) {
    revalidatePath("/compte");
    revalidatePath("/dashboard");
  }

  return {
    accepted: row?.accepted ?? false,
    reason: row?.reason ?? null,
    until: row?.until ?? null,
  };
}

/**
 * Mise à jour du profil depuis les réglages.
 *
 * ⚠️ Ces champs n'étaient modifiables QU'À l'inscription. Or ce sont eux que le
 * styliste lit pour juger une tenue : quelqu'un qui s'était trompé de
 * morphologie, ou dont les goûts ont changé, recevait des conseils calés sur une
 * réponse donnée une fois, sans aucun moyen d'y revenir.
 *
 * Le même schéma que l'inscription — délibérément importé plutôt que recopié.
 * Deux validations qui divergent, c'est une porte ouverte du côté le moins
 * regardé, et la base rejette de toute façon ce qui sort de ses contraintes.
 */
export async function updateProfile(
  input: ProfileInput
): Promise<{ ok: boolean; message: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: "Ces informations n'ont pas été acceptées." };
  }

  const { error } = await supabase
    .from("profiles")
    .update(parsed.data)
    .eq("id", user.id);

  if (error) {
    return { ok: false, message: "Enregistrement impossible. Réessaie." };
  }

  // L'accueil affiche le prénom, les réglages affichent le résumé : les deux
  // montreraient l'ancienne valeur sans ça.
  revalidatePath("/compte");
  revalidatePath("/compte/profil");
  revalidatePath("/dashboard");

  return { ok: true, message: null };
}
