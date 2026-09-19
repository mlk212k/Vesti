"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { actionError, type ActionResult } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";

// Le profil qu'on modifie soi-même : nom et téléphone, rien d'autre.
//
// Le rôle, l'objectif personnel et l'activation ne sont PAS dans ce
// formulaire — et le trigger `guard_profile_update` les refuserait même s'ils
// arrivaient par une requête forgée à la main.
export async function updateProfileAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const user = await requireUser();

    const parsed = z
      .object({
        full_name: z.string().trim().min(1, "Nom requis").max(120),
        phone: z.string().trim().max(40).optional(),
      })
      .safeParse({
        full_name: formData.get("full_name"),
        phone: formData.get("phone") || undefined,
      });

    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Formulaire invalide" };
    }

    const supabase = await createClient();
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: parsed.data.full_name,
        phone: parsed.data.phone ?? null,
      })
      .eq("id", user.id);
    if (error) throw error;

    revalidatePath("/", "layout");
    return { ok: true };
  } catch (error) {
    return actionError(error);
  }
}

export async function changePasswordAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const user = await requireUser();

    const parsed = z
      .object({
        password: z.string().min(8, "8 caractères minimum"),
        confirm: z.string(),
      })
      .refine((v) => v.password === v.confirm, {
        message: "Les deux mots de passe diffèrent",
      })
      .safeParse({
        password: formData.get("password"),
        confirm: formData.get("confirm"),
      });

    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Formulaire invalide" };
    }

    const supabase = await createClient();
    const { error } = await supabase.auth.updateUser({
      password: parsed.data.password,
    });
    if (error) throw error;

    await supabase.rpc("log_audit", {
      p_action: "auth.password_changed",
      p_entity_type: "profile",
      p_entity_id: user.id,
    });

    return { ok: true };
  } catch (error) {
    return actionError(error);
  }
}
