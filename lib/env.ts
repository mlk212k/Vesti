/**
 * Accès centralisé aux variables d'environnement.
 *
 * Les `process.env.X` sont écrits littéralement : le bundler Next.js remplace
 * ces expressions à la compilation, un accès dynamique `process.env[nom]` ne
 * fonctionnerait pas côté client.
 *
 * Les secrets vivent dans `lib/env.server.ts`, protégé par `server-only`.
 */

/**
 * Coordonnées du projet Supabase, en repli.
 *
 * ⚠️ Ce ne sont pas des secrets, et ce n'est pas un raccourci douteux : le
 * préfixe `NEXT_PUBLIC_` demande explicitement à Next.js d'inscrire ces deux
 * valeurs dans le JavaScript envoyé au navigateur. Elles sont donc déjà
 * lisibles par n'importe quel visiteur du site, par construction. Ce qui
 * protège les données, c'est la Row Level Security en base — pas la
 * confidentialité de ces deux chaînes.
 *
 * Les inscrire ici permet à l'application de démarrer sans aucune
 * configuration. La variable d'environnement reste prioritaire quand elle est
 * renseignée : changer de projet ou faire tourner la clé ne demande pas de
 * toucher au code.
 *
 * La clé `service_role`, elle, n'a rien à faire ici ni dans aucun fichier
 * versionné : elle contourne toute la RLS. Sa place est dans `env.server.ts`,
 * alimenté par une variable d'environnement, et nulle part ailleurs.
 */
const SUPABASE_PROJECT = {
  url: "https://raeexianlaehesmrejho.supabase.co",
  anonKey: "sb_publishable_JAoq21X_R3V85uUXDk7lsA_DgGuMc0-",
} as const;

/**
 * Première valeur réellement renseignée.
 *
 * Une variable existante mais vide — ou remplie d'espaces — doit compter comme
 * absente : c'est l'état dans lequel se retrouve un tableau de bord où la
 * variable a été créée mais jamais remplie, et le repli doit s'y appliquer.
 */
function firstFilled(...values: (string | undefined)[]): string | undefined {
  for (const value of values) {
    const trimmed = value?.trim();
    if (trimmed) return trimmed;
  }
  return undefined;
}

export const env = {
  /**
   * Adresse publique du site. Sert au retour de la connexion Google, qui doit
   * pointer vers le domaine réel et non vers localhost.
   *
   * Vercel expose automatiquement le domaine de production aux projets
   * Next.js : on s'en sert plutôt que d'exiger une variable de plus.
   */
  get siteUrl(): string {
    const explicit = firstFilled(process.env.NEXT_PUBLIC_SITE_URL);
    if (explicit) return explicit.replace(/\/+$/, "");

    const vercel = firstFilled(process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL);
    if (vercel) return `https://${vercel}`;

    return "http://localhost:3000";
  },

  get siteName(): string {
    return firstFilled(process.env.NEXT_PUBLIC_SITE_NAME) ?? "Vesti";
  },

  get supabaseUrl(): string {
    return firstFilled(process.env.NEXT_PUBLIC_SUPABASE_URL) ?? SUPABASE_PROJECT.url;
  },

  get supabaseAnonKey(): string {
    return (
      firstFilled(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) ??
      SUPABASE_PROJECT.anonKey
    );
  },
};

export const __test = { firstFilled, SUPABASE_PROJECT };
