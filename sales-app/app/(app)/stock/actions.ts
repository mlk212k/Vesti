"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { actionError, type ActionResult } from "@/lib/errors";
import { parseAmountToCents } from "@/lib/money";
import { createClient } from "@/lib/supabase/server";

// Chaque action passe par la fonction SQL correspondante, qui pose un verrou,
// vérifie que le stock suffit et écrit le mouvement dans le grand livre.
// `requireRole` ici sert à renvoyer une page propre ; la vraie interdiction
// est dans la fonction (`FORBIDDEN`).

const quantitySchema = z.coerce.number().int().min(1).max(100000);

export async function restockAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  try {
    await requireRole("admin");

    const quantity = quantitySchema.safeParse(formData.get("quantity"));
    if (!quantity.success) return { ok: false, error: "Quantité invalide." };

    const label = String(formData.get("label") ?? "").trim().slice(0, 120);
    const rawCost = String(formData.get("unit_cost") ?? "").trim();
    const unitCost = rawCost ? parseAmountToCents(rawCost) : null;
    if (rawCost && unitCost === null) {
      return { ok: false, error: "Coût unitaire invalide." };
    }

    const supabase = await createClient();
    const { error } = await supabase.rpc("restock_cards", {
      p_quantity: quantity.data,
      p_label: label || "Réapprovisionnement",
      p_unit_cost_cents: unitCost,
    });
    if (error) throw error;

    revalidatePath("/stock");
    return { ok: true };
  } catch (error) {
    return actionError(error);
  }
}

export async function allocateAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  try {
    await requireRole("admin", "manager");

    const member = z.uuid().safeParse(formData.get("member_id"));
    const quantity = quantitySchema.safeParse(formData.get("quantity"));
    if (!member.success) return { ok: false, error: "Membre introuvable." };
    if (!quantity.success) return { ok: false, error: "Quantité invalide." };

    const supabase = await createClient();
    const { error } = await supabase.rpc("allocate_cards", {
      p_member: member.data,
      p_quantity: quantity.data,
      p_note: String(formData.get("note") ?? "").trim().slice(0, 240) || null,
    });
    if (error) throw error;

    revalidatePath("/stock");
    revalidatePath("/equipe");
    return { ok: true };
  } catch (error) {
    return actionError(error);
  }
}

export async function returnAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  try {
    await requireRole("admin", "manager");

    const member = z.uuid().safeParse(formData.get("member_id"));
    const quantity = quantitySchema.safeParse(formData.get("quantity"));
    if (!member.success) return { ok: false, error: "Membre introuvable." };
    if (!quantity.success) return { ok: false, error: "Quantité invalide." };

    const supabase = await createClient();
    const { error } = await supabase.rpc("return_cards", {
      p_member: member.data,
      p_quantity: quantity.data,
      p_note: String(formData.get("note") ?? "").trim().slice(0, 240) || null,
    });
    if (error) throw error;

    revalidatePath("/stock");
    revalidatePath("/equipe");
    return { ok: true };
  } catch (error) {
    return actionError(error);
  }
}

export async function lossAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  try {
    await requireRole("admin", "manager");

    const member = z.uuid().safeParse(formData.get("member_id"));
    const quantity = quantitySchema.safeParse(formData.get("quantity"));
    if (!member.success) return { ok: false, error: "Membre introuvable." };
    if (!quantity.success) return { ok: false, error: "Quantité invalide." };

    const supabase = await createClient();
    const { error } = await supabase.rpc("register_card_loss", {
      p_member: member.data,
      p_quantity: quantity.data,
      p_note: String(formData.get("note") ?? "").trim().slice(0, 240) || null,
    });
    if (error) throw error;

    revalidatePath("/stock");
    return { ok: true };
  } catch (error) {
    return actionError(error);
  }
}

// Recomptage du dépôt. La justification est obligatoire (la fonction SQL la
// refuse vide) : une correction d'inventaire sans motif, c'est un trou.
export async function adjustAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  try {
    await requireRole("admin");

    const delta = z.coerce
      .number()
      .int()
      .refine((value) => value !== 0, "Écart nul")
      .safeParse(formData.get("delta"));
    if (!delta.success) return { ok: false, error: "Écart invalide." };

    const note = String(formData.get("note") ?? "").trim();
    if (!note) return { ok: false, error: "Une justification est obligatoire." };

    const supabase = await createClient();
    const { error } = await supabase.rpc("adjust_stock", {
      p_delta: delta.data,
      p_note: note.slice(0, 240),
    });
    if (error) throw error;

    revalidatePath("/stock");
    return { ok: true };
  } catch (error) {
    return actionError(error);
  }
}
