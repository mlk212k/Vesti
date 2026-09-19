import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./config";

// Client par requête, porteur de la session de l'utilisateur. Toutes les
// lectures passent par lui : c'est ce qui fait que la RLS s'applique.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
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
          // Appelé depuis le rendu d'un Server Component : les cookies y sont
          // en lecture seule. Le proxy rafraîchit la session, donc ignorer
          // est sans conséquence.
        }
      },
    },
  });
}
