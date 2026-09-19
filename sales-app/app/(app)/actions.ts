"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { actionError, type ActionResult } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";

// Journée de travail. Les deux boutons les plus utilisés de l'app.
//
// Aucun calcul ici : `start_work_day` et `end_work_day` (migration 0003)
// figent l'objectif, écrivent l'audit et préviennent l'encadrement dans une
// seule transaction. Cette couche-ci ne fait que transporter l'erreur
// éventuelle jusqu'à l'écran.

export async function startDayAction(): Promise<ActionResult> {
  try {
    await requireUser();
    const supabase = await createClient();
    const { error } = await supabase.rpc("start_work_day");
    if (error) throw error;

    revalidatePath("/", "layout");
    return { ok: true };
  } catch (error) {
    return actionError(error);
  }
}

export async function endDayAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  try {
    await requireUser();
    const notes = String(formData.get("notes") ?? "").slice(0, 2000);

    const supabase = await createClient();
    const { error } = await supabase.rpc("end_work_day", {
      p_notes: notes || null,
    });
    if (error) throw error;

    revalidatePath("/", "layout");
    return { ok: true };
  } catch (error) {
    return actionError(error);
  }
}
