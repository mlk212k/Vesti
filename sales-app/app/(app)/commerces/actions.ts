"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { actionError, type ActionResult } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";

// Les fiches commerce s'écrivent directement dans la table : elles n'engagent
// ni stock ni argent, et la RLS garantit déjà qu'on n'écrit que chez soi
// (`businesses_insert_self`). Pas besoin d'une fonction SQL pour ça.

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => (value ? value : null));

const businessSchema = z.object({
  name: z.string().trim().min(1, "Le nom du commerce est requis").max(160),
  category: optionalText(80),
  address: optionalText(240),
  city: optionalText(120),
  postal_code: optionalText(16),
  contact_name: optionalText(120),
  phone: optionalText(40),
  email: z
    .string()
    .trim()
    .max(160)
    .optional()
    .transform((value) => (value ? value.toLowerCase() : null))
    .refine((value) => value === null || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value), {
      message: "Email invalide",
    }),
  status: z.enum(["prospect", "client", "callback", "refused"]).default("prospect"),
  notes: optionalText(2000),
  next_action: optionalText(240),
  next_action_at: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value ? value : null)),
  photo_url: optionalText(500),
});

function readForm(formData: FormData) {
  return {
    name: formData.get("name") ?? "",
    category: formData.get("category") ?? undefined,
    address: formData.get("address") ?? undefined,
    city: formData.get("city") ?? undefined,
    postal_code: formData.get("postal_code") ?? undefined,
    contact_name: formData.get("contact_name") ?? undefined,
    phone: formData.get("phone") ?? undefined,
    email: formData.get("email") ?? undefined,
    status: formData.get("status") || "prospect",
    notes: formData.get("notes") ?? undefined,
    next_action: formData.get("next_action") ?? undefined,
    next_action_at: formData.get("next_action_at") ?? undefined,
    photo_url: formData.get("photo_url") ?? undefined,
  };
}

export async function createBusinessAction(
  _prev: ActionResult<string> | undefined,
  formData: FormData,
): Promise<ActionResult<string>> {
  try {
    const user = await requireUser();
    const parsed = businessSchema.safeParse(readForm(formData));
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Formulaire invalide" };
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("businesses")
      .insert({ ...parsed.data, member_id: user.id })
      .select("id")
      .single<{ id: string }>();
    if (error) throw error;

    await supabase.rpc("log_audit", {
      p_action: "business.created",
      p_entity_type: "business",
      p_entity_id: data.id,
      p_metadata: { name: parsed.data.name, city: parsed.data.city },
    });

    revalidatePath("/commerces");
    return { ok: true, data: data.id };
  } catch (error) {
    return actionError(error);
  }
}

export async function updateBusinessAction(
  _prev: ActionResult<string> | undefined,
  formData: FormData,
): Promise<ActionResult<string>> {
  try {
    await requireUser();
    const id = z.uuid().safeParse(formData.get("business_id"));
    if (!id.success) return { ok: false, error: "Commerce introuvable." };

    const parsed = businessSchema.safeParse(readForm(formData));
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Formulaire invalide" };
    }

    const supabase = await createClient();
    const { error } = await supabase
      .from("businesses")
      .update(parsed.data)
      .eq("id", id.data);
    if (error) throw error;

    await supabase.rpc("log_audit", {
      p_action: "business.updated",
      p_entity_type: "business",
      p_entity_id: id.data,
    });

    revalidatePath("/commerces");
    revalidatePath(`/commerces/${id.data}`);
    return { ok: true };
  } catch (error) {
    return actionError(error);
  }
}

export async function deleteBusinessAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  try {
    await requireUser();
    const id = z.uuid().safeParse(formData.get("business_id"));
    if (!id.success) return { ok: false, error: "Commerce introuvable." };

    const supabase = await createClient();
    const { error } = await supabase.from("businesses").delete().eq("id", id.data);
    if (error) throw error;

    await supabase.rpc("log_audit", {
      p_action: "business.deleted",
      p_entity_type: "business",
      p_entity_id: id.data,
    });

    revalidatePath("/commerces");
    return { ok: true };
  } catch (error) {
    return actionError(error);
  }
}
