"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const credentialsSchema = z.object({
  email: z.string().email("Email invalide"),
  password: z.string().min(6, "Mot de passe trop court (min. 6 caractères)"),
  full_name: z.string().min(1).max(120).optional(),
  next: z.string().startsWith("/").optional(),
});

export type AuthResult = { error: string } | undefined;

export async function signInAction(
  _prev: AuthResult,
  formData: FormData,
): Promise<AuthResult> {
  const parsed = credentialsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    next: formData.get("next") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide" };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });
  if (error) return { error: error.message };

  redirect(parsed.data.next ?? "/dashboard");
}

export async function signUpAction(
  _prev: AuthResult,
  formData: FormData,
): Promise<AuthResult> {
  const parsed = credentialsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    full_name: formData.get("full_name"),
    next: formData.get("next") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide" };
  }
  if (!parsed.data.full_name) {
    return { error: "Ton nom est requis" };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.full_name },
    },
  });
  if (error) return { error: error.message };

  redirect(parsed.data.next ?? "/dashboard");
}
