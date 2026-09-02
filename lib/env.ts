/**
 * Accès centralisé aux variables d'environnement.
 *
 * Les `process.env.X` sont écrits littéralement : le bundler Next.js remplace
 * ces expressions à la compilation, un accès dynamique `process.env[nom]` ne
 * fonctionnerait pas côté client.
 *
 * Les secrets vivent dans `lib/env.server.ts`, protégé par `server-only`.
 */

function required(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(
      `Variable d'environnement manquante : ${name}. Copie .env.example vers .env.local et renseigne-la.`
    );
  }
  return value;
}

export const env = {
  get siteUrl(): string {
    return process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  },
  get supabaseUrl(): string {
    return required(process.env.NEXT_PUBLIC_SUPABASE_URL, "NEXT_PUBLIC_SUPABASE_URL");
  },
  get supabaseAnonKey(): string {
    return required(
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      "NEXT_PUBLIC_SUPABASE_ANON_KEY"
    );
  },
};
