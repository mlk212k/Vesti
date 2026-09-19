"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { actionError, type ActionResult } from "@/lib/errors";
import { parseAmountToCents } from "@/lib/money";
import { createClient } from "@/lib/supabase/server";

// Le taux de commission, l'objectif et le prix par défaut vivent en base, sur
// une ligne unique. Rien de tout ça n'est écrit en dur dans le code : ni dans
// une page, ni dans une fonction SQL. Chaque vente fige ensuite le taux qui
// avait cours au moment où elle a été faite.

const settingsSchema = z.object({
  team_name: z.string().trim().min(1, "Nom requis").max(60),
  commission_rate: z.string().trim(),
  default_daily_goal: z.coerce.number().int().min(1, "Objectif minimum : 1").max(1000),
  default_card_price: z.string().trim(),
  missed_goal_penalty: z.string().trim(),
});

export async function updateSettingsAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  try {
    await requireRole("admin");

    const parsed = settingsSchema.safeParse({
      team_name: formData.get("team_name"),
      commission_rate: formData.get("commission_rate"),
      default_daily_goal: formData.get("default_daily_goal"),
      default_card_price: formData.get("default_card_price"),
      missed_goal_penalty: formData.get("missed_goal_penalty") || "0",
    });

    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Formulaire invalide" };
    }

    // « 10 » ou « 10,5 » -> points de base. On passe par la même conversion
    // que les montants (deux décimales, entier au bout) pour ne pas voir
    // apparaître un 999,9999 flottant dans la base.
    const rateBp = parseAmountToCents(parsed.data.commission_rate);
    if (rateBp === null || rateBp > 10000) {
      return { ok: false, error: "Taux de commission invalide (0 à 100)." };
    }

    const priceCents = parseAmountToCents(parsed.data.default_card_price);
    if (priceCents === null) {
      return { ok: false, error: "Prix par défaut invalide." };
    }

    const penaltyCents = parseAmountToCents(parsed.data.missed_goal_penalty) ?? 0;

    const supabase = await createClient();
    const { error } = await supabase
      .from("app_settings")
      .update({
        team_name: parsed.data.team_name,
        commission_rate_bp: rateBp,
        default_daily_goal: parsed.data.default_daily_goal,
        default_card_price_cents: priceCents,
        missed_goal_penalty_cents: penaltyCents,
      })
      .eq("id", 1);
    if (error) throw error;

    // Pas de log_audit ici : un trigger sur app_settings écrit l'avant/après
    // à chaque modification. Le tracer aussi côté app ferait doublon — et
    // un jour l'un des deux serait oublié.
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (error) {
    return actionError(error);
  }
}
