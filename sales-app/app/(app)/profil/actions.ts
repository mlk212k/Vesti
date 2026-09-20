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

// Photo de profil. Le fichier est déjà dans le bucket public quand cette
// action est appelée (le navigateur l'y a poussé directement) ; on ne fait
// qu'enregistrer son chemin.
export async function updateAvatarAction(chemin: string): Promise<ActionResult> {
  try {
    const user = await requireUser();

    // Le chemin doit commencer par l'identifiant de la personne : c'est la
    // même règle que la policy de stockage, revérifiée ici pour qu'un chemin
    // forgé ne puisse pas pointer vers le dossier d'un autre.
    const attendu = `${user.id}/`;
    if (chemin && !chemin.startsWith(attendu)) {
      return { ok: false, error: "Chemin de photo invalide." };
    }
    if (chemin.length > 300) {
      return { ok: false, error: "Chemin de photo invalide." };
    }

    const supabase = await createClient();
    const { error } = await supabase
      .from("profiles")
      .update({ avatar_url: chemin || null })
      .eq("id", user.id);
    if (error) throw error;

    revalidatePath("/", "layout");
    return { ok: true };
  } catch (error) {
    return actionError(error);
  }
}

// Créneaux de disponibilité.
//
// On remplace l'ensemble plutôt que de calculer un différentiel : sept jours
// × deux créneaux font quatorze lignes au maximum, et un remplacement
// complet ne peut pas laisser d'état incohérent si la requête est rejouée.
export async function updateAvailabilityAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const user = await requireUser();

    // Un encadrant peut poser les créneaux de quelqu'un d'autre ; la RLS
    // (`availabilities_insert`) tranche pour de bon.
    const cible = String(formData.get("member_id") ?? "") || user.id;

    const creneaux: { member_id: string; weekday: number; slot: "am" | "pm" }[] =
      [];
    for (let jour = 1; jour <= 7; jour += 1) {
      for (const slot of ["am", "pm"] as const) {
        if (formData.get(`c-${jour}-${slot}`) === "on") {
          creneaux.push({ member_id: cible, weekday: jour, slot });
        }
      }
    }

    const supabase = await createClient();

    const { error: suppression } = await supabase
      .from("availabilities")
      .delete()
      .eq("member_id", cible);
    if (suppression) throw suppression;

    if (creneaux.length > 0) {
      const { error } = await supabase.from("availabilities").insert(creneaux);
      if (error) throw error;
    }

    await supabase.rpc("log_audit", {
      p_action: "planning.updated",
      p_entity_type: "profile",
      p_entity_id: cible,
      p_metadata: { creneaux: creneaux.length },
    });

    revalidatePath("/profil");
    revalidatePath("/planning");
    return { ok: true };
  } catch (error) {
    return actionError(error);
  }
}
