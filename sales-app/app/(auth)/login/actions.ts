"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import {
  clearLoginAttempts,
  loginAllowed,
  registerFailedLogin,
} from "@/lib/throttle";

// Les claviers mobiles ajoutent volontiers une espace après une suggestion :
// on la retire avant de valider le format, sinon l'email « correct » est
// refusé et personne ne comprend pourquoi.
const credentials = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email("Email invalide")),
  password: z.string().min(1, "Mot de passe requis"),
  next: z.string().startsWith("/").optional(),
});

export type AuthState = { error: string } | undefined;

export async function signInAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed = credentials.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    next: formData.get("next") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide" };
  }

  const { email, password } = parsed.data;

  if (!(await loginAllowed(email))) {
    return {
      error: "Trop de tentatives. Réessaie dans une quinzaine de minutes.",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    await registerFailedLogin(email);
    // Message volontairement identique pour « email inconnu » et « mauvais
    // mot de passe » : sinon la page devient un testeur d'adresses.
    return { error: "Identifiants incorrects." };
  }

  await clearLoginAttempts(email);
  await supabase.rpc("log_audit", {
    p_action: "auth.login",
    p_entity_type: "profile",
  });

  // Une cible de redirection doit rester interne : « //evil.com » commence
  // bien par « / » mais partirait sur un autre domaine.
  const next = parsed.data.next;
  const safeNext = next && !next.startsWith("//") ? next : "/";
  redirect(safeNext);
}

const emailOnly = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email("Email invalide")),
});

export type ResetState = { error: string } | { sent: true } | undefined;

export async function requestPasswordResetAction(
  _prev: ResetState,
  formData: FormData,
): Promise<ResetState> {
  const parsed = emailOnly.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Email invalide" };
  }

  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const supabase = await createClient();

  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${site}/auth/callback?next=/nouveau-mot-de-passe`,
  });

  // On répond « envoyé » quoi qu'il arrive : confirmer qu'une adresse existe
  // reviendrait à publier la liste des comptes.
  return { sent: true };
}

const newPassword = z
  .object({
    password: z.string().min(8, "8 caractères minimum"),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, {
    message: "Les deux mots de passe diffèrent",
    path: ["confirm"],
  });

export type UpdatePasswordState = { error: string } | undefined;

export async function updatePasswordAction(
  _prev: UpdatePasswordState,
  formData: FormData,
): Promise<UpdatePasswordState> {
  const parsed = newPassword.safeParse({
    password: formData.get("password"),
    confirm: formData.get("confirm"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Lien expiré. Redemande un email de réinitialisation." };
  }

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });
  if (error) return { error: error.message };

  await supabase.rpc("log_audit", {
    p_action: "auth.password_changed",
    p_entity_type: "profile",
    p_entity_id: user.id,
  });

  redirect("/");
}
