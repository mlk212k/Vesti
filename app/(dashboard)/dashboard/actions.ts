"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

/** Mêmes bornes qu'à l'onboarding et qu'en base : 1 à 40 caractères utiles. */
const firstNameSchema = z.string().trim().min(1).max(40);

/**
 * Enregistre le prénom depuis l'accueil.
 *
 * Ce second point d'entrée existe pour les comptes créés avant que la question
 * soit posée : l'onboarding ne se rejoue pas, donc sans lui ces personnes
 * n'auraient jamais l'occasion de donner leur prénom.
 */
export async function saveFirstName(value: string): Promise<{ error?: string }> {
  const parsed = firstNameSchema.safeParse(value);
  if (!parsed.success) {
    return { error: "Entre un prénom de 1 à 40 caractères." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase
    .from("profiles")
    .update({ first_name: parsed.data })
    .eq("id", user.id);

  if (error) {
    return { error: "Impossible d'enregistrer ton prénom pour le moment." };
  }

  revalidatePath("/dashboard");
  return {};
}
