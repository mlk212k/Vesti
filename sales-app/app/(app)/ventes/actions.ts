"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { actionError, type ActionResult } from "@/lib/errors";
import { parseAmountToCents } from "@/lib/money";
import { createClient } from "@/lib/supabase/server";

// Montant : jamais envoyé par le client.
//
// Le formulaire transmet une quantité et un prix unitaire ; c'est Postgres
// qui multiplie (colonnes générées de `sales`) et qui applique le taux de
// commission en vigueur. Le champ « total » affiché à l'écran n'est qu'un
// aperçu — s'il était faux, la base ne s'en servirait pas.

const saleSchema = z.object({
  quantity: z.coerce.number().int().min(1, "Au moins une carte").max(1000),
  unit_price: z.string().optional(),
  business_id: z.uuid().optional().nullable(),
  notes: z.string().max(2000).optional(),
  photo_url: z.string().max(500).optional(),
  sold_at: z.string().optional(),
});

export async function createSaleAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  try {
    await requireUser();

    const parsed = saleSchema.safeParse({
      quantity: formData.get("quantity"),
      unit_price: formData.get("unit_price") || undefined,
      business_id: formData.get("business_id") || undefined,
      notes: formData.get("notes") || undefined,
      photo_url: formData.get("photo_url") || undefined,
      sold_at: formData.get("sold_at") || undefined,
    });

    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Formulaire invalide" };
    }

    let unitPriceCents: number | null = null;
    if (parsed.data.unit_price) {
      unitPriceCents = parseAmountToCents(parsed.data.unit_price);
      if (unitPriceCents === null) {
        return { ok: false, error: "Prix unitaire invalide." };
      }
    }

    // Heure saisie à la main : le champ <input type="datetime-local"> donne
    // une heure locale sans fuseau. On la convertit en instant ; la fonction
    // SQL la recadre ensuite dans les bornes de la journée.
    let soldAt: string | null = null;
    if (parsed.data.sold_at) {
      const date = new Date(parsed.data.sold_at);
      if (!Number.isNaN(date.getTime())) soldAt = date.toISOString();
    }

    const supabase = await createClient();
    const { error } = await supabase.rpc("record_sale", {
      p_quantity: parsed.data.quantity,
      p_unit_price_cents: unitPriceCents,
      p_business: parsed.data.business_id ?? null,
      p_notes: parsed.data.notes ?? null,
      p_photo_url: parsed.data.photo_url ?? null,
      p_sold_at: soldAt,
    });
    if (error) throw error;

    revalidatePath("/", "layout");
    return { ok: true };
  } catch (error) {
    return actionError(error);
  }
}

const updateSchema = saleSchema.extend({
  sale_id: z.uuid(),
  unit_price: z.string().min(1, "Prix requis"),
});

export async function updateSaleAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  try {
    await requireUser();

    const parsed = updateSchema.safeParse({
      sale_id: formData.get("sale_id"),
      quantity: formData.get("quantity"),
      unit_price: formData.get("unit_price"),
      business_id: formData.get("business_id") || undefined,
      notes: formData.get("notes") || undefined,
    });

    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Formulaire invalide" };
    }

    const unitPriceCents = parseAmountToCents(parsed.data.unit_price);
    if (unitPriceCents === null) {
      return { ok: false, error: "Prix unitaire invalide." };
    }

    const supabase = await createClient();
    const { error } = await supabase.rpc("update_sale", {
      p_sale: parsed.data.sale_id,
      p_quantity: parsed.data.quantity,
      p_unit_price_cents: unitPriceCents,
      p_business: parsed.data.business_id ?? null,
      p_notes: parsed.data.notes ?? null,
    });
    if (error) throw error;

    revalidatePath("/", "layout");
    return { ok: true };
  } catch (error) {
    return actionError(error);
  }
}

export async function deleteSaleAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  try {
    await requireUser();
    const saleId = z.uuid().safeParse(formData.get("sale_id"));
    if (!saleId.success) return { ok: false, error: "Vente introuvable." };

    const supabase = await createClient();
    // `delete_sale` refuse à quiconque n'est pas admin, et rend les cartes
    // au commercial plutôt que de les faire disparaître.
    const { error } = await supabase.rpc("delete_sale", { p_sale: saleId.data });
    if (error) throw error;

    revalidatePath("/", "layout");
    return { ok: true };
  } catch (error) {
    return actionError(error);
  }
}
