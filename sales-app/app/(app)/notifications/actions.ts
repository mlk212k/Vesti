"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { actionError, type ActionResult } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";

// Marquer comme lu = écrire sur ses propres lignes. La policy
// `notifications_update_own` suffit, aucune fonction n'est nécessaire.

export async function markAllReadAction(): Promise<ActionResult> {
  try {
    await requireUser();
    const supabase = await createClient();
    const { error } = await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .is("read_at", null);
    if (error) throw error;

    revalidatePath("/", "layout");
    return { ok: true };
  } catch (error) {
    return actionError(error);
  }
}
