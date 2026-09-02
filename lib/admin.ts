import "server-only";

/**
 * Contrôle d'accès à l'administration.
 *
 * Une simple liste d'emails autorisés en variable d'environnement : pas de rôle
 * en base, donc rien qu'un utilisateur puisse s'attribuer, même en cas de faille
 * de RLS. La liste vit hors de la base, côté serveur uniquement.
 */
function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const allowed = adminEmails();
  // Une liste vide n'ouvre jamais l'accès : sans configuration explicite,
  // personne n'est administrateur.
  if (allowed.length === 0) return false;
  return allowed.includes(email.trim().toLowerCase());
}

export function adminIsConfigured(): boolean {
  return adminEmails().length > 0;
}
