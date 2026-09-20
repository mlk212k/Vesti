"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { actionError, type ActionResult } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";

// La relance : le geste quotidien du manager. Une notification chez le
// commercial, une trace dans l'audit, et pas plus d'une par heure — la
// fonction SQL refuse la deuxième (NUDGE_TOO_SOON).
export async function relancerAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  try {
    await requireRole("admin", "manager");

    const parsed = z
      .object({
        member_id: z.uuid(),
        message: z.string().trim().max(500).optional(),
      })
      .safeParse({
        member_id: formData.get("member_id"),
        message: formData.get("message") || undefined,
      });

    if (!parsed.success) return { ok: false, error: "Membre introuvable." };

    const supabase = await createClient();
    const { error } = await supabase.rpc("send_nudge", {
      p_member: parsed.data.member_id,
      p_message: parsed.data.message ?? null,
    });
    if (error) throw error;

    revalidatePath("/", "layout");
    return { ok: true };
  } catch (error) {
    return actionError(error);
  }
}
