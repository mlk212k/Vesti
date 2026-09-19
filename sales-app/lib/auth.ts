import "server-only";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { AppSettings, Profile, Role } from "@/lib/types";

export type SessionUser = Profile & { email: string | null };

export async function getSessionUser(): Promise<SessionUser | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "id, full_name, role, phone, avatar_url, daily_goal_override, is_active, created_at",
    )
    .eq("id", user.id)
    .single<Profile>();

  if (!profile) return null;

  // Un compte désactivé garde sa session tant qu'elle n'expire pas : on le
  // traite comme déconnecté plutôt que de lui laisser l'app ouverte.
  if (!profile.is_active) return null;

  return { ...profile, email: user.email ?? null };
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

// Garde de page. Chaque page qui n'est pas pour tout le monde commence par
// un appel à celle-ci — c'est la deuxième barrière, après le proxy et avant
// la RLS.
export async function requireRole(...roles: Role[]): Promise<SessionUser> {
  const user = await requireUser();
  if (!roles.includes(user.role)) redirect("/?interdit=1");
  return user;
}

export function isStaff(role: Role): boolean {
  return role === "admin" || role === "manager";
}

export function isAdmin(role: Role): boolean {
  return role === "admin";
}

// Un membre ne voit que lui. L'encadrement voit tout le monde. Utilisé par
// les pages « profil d'un membre » pour refuser une URL trafiquée avant même
// d'interroger la base.
export function canViewMember(viewer: SessionUser, memberId: string): boolean {
  return viewer.id === memberId || isStaff(viewer.role);
}

export async function getSettings(): Promise<AppSettings> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("app_settings")
    .select("*")
    .eq("id", 1)
    .single<AppSettings>();

  if (error || !data) {
    throw new Error(
      "Paramètres introuvables : les migrations Supabase ont-elles été appliquées ?",
    );
  }
  return data;
}
