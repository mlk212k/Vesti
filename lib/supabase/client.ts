import { createBrowserClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

/** Client Supabase pour les composants client (clé anon, RLS appliquée). */
export function createClient() {
  return createBrowserClient(env.supabaseUrl, env.supabaseAnonKey);
}

/**
 * Client dédié à la connexion par code à 6 chiffres.
 *
 * ⚠️ Il n'utilise PAS `createBrowserClient`, et ce n'est pas un oubli.
 *
 * `@supabase/ssr` impose `flowType: "pkce"` en dur, après l'étalement des
 * options — impossible à surcharger (voir `createBrowserClient.js`). En PKCE,
 * la demande de code joint un `code_challenge` et Supabase range le jeton sous
 * `pkce_<hachage>` : 61 caractères dans `auth.one_time_tokens`, soit `pkce_`
 * puis les 56 du hachage SHA-224.
 *
 * Or `verifyOtp` recalcule le hachage à partir des 6 chiffres SANS ce préfixe.
 * Il ne trouve jamais la ligne et répond « token has expired or is invalid ».
 * Le message ment : le code est bon, c'est la clé de recherche qui diffère —
 * d'où, en production, des codes rejetés dix-huit secondes après leur émission.
 *
 * D'où ce client brut en flux implicite. Il ne persiste rien lui-même : la
 * session qu'il obtient est ensuite posée sur le client à cookies (voir
 * `adoptSession`), qui est le seul que le serveur sait lire.
 *
 * Le client par défaut, lui, reste en PKCE — la connexion Google en dépend,
 * `/auth/callback` échangeant le `code` contre une session.
 */
export function createOtpClient() {
  return createSupabaseClient(env.supabaseUrl, env.supabaseAnonKey, {
    auth: {
      flowType: "implicit",
      // Rien à stocker ici : c'est le client à cookies qui portera la session.
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

/**
 * Transfère une session obtenue hors du client à cookies vers celui-ci.
 *
 * Sans cette étape, la session ne vivrait que dans la mémoire du client OTP :
 * le proxy et les pages serveur, qui lisent les cookies, verraient un visiteur
 * toujours déconnecté.
 */
export async function adoptSession(tokens: {
  access_token: string;
  refresh_token: string;
}): Promise<{ ok: boolean; message?: string }> {
  const { error } = await createClient().auth.setSession(tokens);
  if (error) {
    // Un échec ici est invisible autrement : le code serait accepté, puis la
    // page suivante renverrait vers la connexion, sans rien expliquer.
    console.error("[auth] pose de session impossible", error);
    return { ok: false, message: error.message };
  }
  return { ok: true };
}
