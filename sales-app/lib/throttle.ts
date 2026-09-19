import "server-only";

import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";

// Adresse de l'appelant telle que la voit Vercel. `x-forwarded-for` peut
// contenir une chaîne de proxys : la première entrée est le client.
export async function callerIp(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return h.get("x-real-ip") ?? "unknown";
}

// Les trois fonctions ci-dessous passent par la clé service_role (voir
// migration 0005 : le compteur est invisible depuis les clés publiques).
//
// Si la clé n'est pas configurée, on laisse passer plutôt que de bloquer
// toute l'authentification : Supabase applique de toute façon ses propres
// quotas sur l'endpoint d'auth. Un garde-fou absent ne doit pas se
// transformer en porte fermée.

export async function loginAllowed(email: string): Promise<boolean> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.rpc("login_allowed", {
      p_email: email,
      p_ip: await callerIp(),
    });
    if (error) return true;
    return data !== false;
  } catch {
    return true;
  }
}

export async function registerFailedLogin(email: string): Promise<void> {
  try {
    const admin = createAdminClient();
    await admin.rpc("register_failed_login", {
      p_email: email,
      p_ip: await callerIp(),
    });
  } catch {
    // Sans clé service_role, pas de compteur — voir ci-dessus.
  }
}

export async function clearLoginAttempts(email: string): Promise<void> {
  try {
    const admin = createAdminClient();
    await admin.rpc("clear_login_attempts", {
      p_email: email,
      p_ip: await callerIp(),
    });
  } catch {
    // Idem.
  }
}
