"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { actionError, type ActionResult } from "@/lib/errors";
import { parseAmountToCents } from "@/lib/money";
import { createClient } from "@/lib/supabase/server";

// Validation d'une journée par l'encadrement.
//
// C'est le seul chemin par lequel une retenue peut exister. Elle est saisie
// ici, par un humain, sur une journée déjà terminée — jamais calculée ni
// prélevée toute seule. Le montant par défaut proposé à l'écran vient des
// paramètres, mais il reste modifiable et peut être mis à zéro.
export async function validateDayAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  try {
    await requireRole("admin", "manager");

    const dayId = z.uuid().safeParse(formData.get("day_id"));
    if (!dayId.success) return { ok: false, error: "Journée introuvable." };

    const rawPenalty = String(formData.get("penalty") ?? "").trim();
    let penaltyCents = 0;
    if (rawPenalty) {
      const parsed = parseAmountToCents(rawPenalty);
      if (parsed === null) return { ok: false, error: "Montant de retenue invalide." };
      penaltyCents = parsed;
    }

    const supabase = await createClient();
    const { error } = await supabase.rpc("validate_work_day", {
      p_day: dayId.data,
      p_penalty_cents: penaltyCents,
    });
    if (error) throw error;

    revalidatePath("/equipe");
    revalidatePath("/historique");
    return { ok: true };
  } catch (error) {
    return actionError(error);
  }
}

// Fige la commission due par un commercial sur une période, puis permet de la
// marquer réglée. Le montant n'est pas saisi : il est recalculé depuis les
// ventes de la période par la fonction SQL.
export async function createPayoutAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  try {
    await requireRole("admin");

    const schema = z.object({
      member_id: z.uuid(),
      period_start: z.string().min(10),
      period_end: z.string().min(10),
      note: z.string().max(240).optional(),
    });

    const parsed = schema.safeParse({
      member_id: formData.get("member_id"),
      period_start: formData.get("period_start"),
      period_end: formData.get("period_end"),
      note: formData.get("note") || undefined,
    });
    if (!parsed.success) return { ok: false, error: "Période invalide." };

    const supabase = await createClient();
    const { error } = await supabase.rpc("create_commission_payout", {
      p_member: parsed.data.member_id,
      p_start: parsed.data.period_start,
      p_end: parsed.data.period_end,
      p_note: parsed.data.note ?? null,
    });
    if (error) throw error;

    revalidatePath(`/equipe/${parsed.data.member_id}`);
    return { ok: true };
  } catch (error) {
    return actionError(error);
  }
}

export async function markPayoutPaidAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  try {
    await requireRole("admin");

    const payoutId = z.uuid().safeParse(formData.get("payout_id"));
    if (!payoutId.success) return { ok: false, error: "Règlement introuvable." };

    const supabase = await createClient();
    const { error } = await supabase.rpc("mark_payout_paid", {
      p_payout: payoutId.data,
    });
    if (error) throw error;

    revalidatePath("/equipe");
    return { ok: true };
  } catch (error) {
    return actionError(error);
  }
}
