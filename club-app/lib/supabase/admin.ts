import "server-only";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "./config";

// Bypasses RLS entirely — only for backend jobs with no signed-in user at
// all (the training-reminders cron), never for a request made on behalf
// of a specific member. SUPABASE_SERVICE_ROLE_KEY is a real secret (never
// hardcoded, unlike the anon key): Project Settings > API in Supabase.
export function createAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY manquante");
  }
  return createClient(SUPABASE_URL, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
