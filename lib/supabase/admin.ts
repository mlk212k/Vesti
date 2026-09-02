import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";
import { serverEnv } from "@/lib/env.server";

/**
 * Client service_role : contourne la RLS.
 *
 * Réservé aux écritures que le client ne doit pas pouvoir faire lui-même :
 * insertion des analyses, application des events Stripe, mise à jour du plan.
 * Ne jamais l'utiliser pour lire des données « au nom » d'un utilisateur sans
 * filtrer explicitement sur son id — la RLS ne protège plus ici.
 */
export function createAdminClient() {
  return createSupabaseClient(env.supabaseUrl, serverEnv.supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
