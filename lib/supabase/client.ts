import { createBrowserClient } from "@supabase/ssr";
import { env } from "@/lib/env";

/** Client Supabase pour les composants client (clé anon, RLS appliquée). */
export function createClient() {
  return createBrowserClient(env.supabaseUrl, env.supabaseAnonKey);
}
