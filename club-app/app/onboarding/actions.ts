"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { CATEGORIES } from "@/lib/categories";
import { createClient } from "@/lib/supabase/server";

export async function setCategoryAction(category: string) {
  const user = await requireUser();
  const parsed = z.enum(CATEGORIES).safeParse(category);
  if (!parsed.success) throw new Error("Catégorie invalide");

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ category: parsed.data })
    .eq("id", user.id);
  if (error) throw new Error(error.message);

  revalidatePath("/onboarding");
  revalidatePath("/profile");
  revalidatePath("/members");
}
