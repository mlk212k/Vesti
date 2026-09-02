"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

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
