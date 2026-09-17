"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { CATEGORIES } from "@/lib/categories";
import { createClient } from "@/lib/supabase/server";

const profileSchema = z.object({
  full_name: z.string().min(1).max(120),
  category: z.enum(CATEGORIES).optional().nullable(),
  jersey_number: z
    .string()
    .optional()
    .transform((v) => {
      if (!v) return null;
      const n = Number.parseInt(v, 10);
      return Number.isFinite(n) ? n : null;
    }),
  position: z.string().max(60).optional().nullable(),
  phone: z.string().max(40).optional().nullable(),
});

function nullableString(v: FormDataEntryValue | null): string | null {
  const s = typeof v === "string" ? v.trim() : "";
  return s.length ? s : null;
}

export async function updateProfileAction(formData: FormData) {
  const user = await requireUser();

  const parsed = profileSchema.safeParse({
    full_name: formData.get("full_name"),
    category: formData.get("category") || null,
    jersey_number: formData.get("jersey_number") || undefined,
    position: nullableString(formData.get("position")),
    phone: nullableString(formData.get("phone")),
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Formulaire invalide");
  }

  const supabase = await createClient();
  // Explicitly exclude `role` — that stays admin-only, enforced here and by
  // the "profiles_update_self" RLS policy (which restricts the row scope).
  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: parsed.data.full_name,
      category: parsed.data.category,
      jersey_number: parsed.data.jersey_number,
      position: parsed.data.position,
      phone: parsed.data.phone,
    })
    .eq("id", user.id);
  if (error) throw new Error(error.message);

  revalidatePath("/profile");
  revalidatePath("/members");
}
