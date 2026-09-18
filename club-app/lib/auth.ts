import "server-only";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type Role = "admin" | "coach" | "member";

export type SessionUser = {
  id: string;
  email: string | null;
  full_name: string;
  role: Role;
  category: string | null;
  avatar_url: string | null;
};

export async function getSessionUser(): Promise<SessionUser | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, role, category, avatar_url")
    .eq("id", user.id)
    .single();

  if (!profile) return null;

  return {
    id: profile.id,
    email: user.email ?? null,
    full_name: profile.full_name,
    role: profile.role as Role,
    category: profile.category,
    avatar_url: profile.avatar_url,
  };
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireRole(...roles: Role[]): Promise<SessionUser> {
  const user = await requireUser();
  if (!roles.includes(user.role)) {
    redirect("/dashboard?forbidden=1");
  }
  return user;
}

export function canManage(role: Role): boolean {
  return role === "admin" || role === "coach";
}

export function isCoach(role: Role): boolean {
  return role === "coach";
}
