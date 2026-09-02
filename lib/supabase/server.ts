import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { env } from "@/lib/env";

/**
 * Client Supabase pour les Server Components, Server Actions et Route Handlers.
 * La session vient des cookies, la RLS s'applique donc à l'utilisateur connecté.
 *
 * `cookies()` est asynchrone depuis Next.js 15/16 — d'où le `await` obligatoire.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Appelé depuis un Server Component : l'écriture de cookies y est
          // interdite. Sans conséquence, le rafraîchissement de session est
          // assuré par proxy.ts à chaque requête.
        }
      },
    },
  });
}
