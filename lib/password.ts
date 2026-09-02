/**
 * Règles du mot de passe, et traduction des erreurs d'authentification.
 *
 * Tout est ici plutôt que dans le formulaire pour deux raisons : ces règles se
 * testent sans monter de composant, et les messages d'erreur bruts de Supabase
 * sont en anglais et parlent d'implémentation. « Invalid login credentials » ne
 * dit rien à quelqu'un qui a juste tapé son mot de passe de travers.
 */

/**
 * Supabase accepte 6 caractères par défaut. On exige 8 : ce compte donne accès
 * à des photos de la personne, et six caractères se cassent hors ligne en
 * quelques minutes. La règle s'arrête là — imposer majuscules et chiffres
 * pousse surtout à choisir « Motdepasse1! », plus long à taper et pas plus sûr.
 */
export const PASSWORD_MIN_LENGTH = 8;

/**
 * Ce qui cloche dans un mot de passe, ou `null` s'il convient.
 * Renvoie un message affichable tel quel.
 */
export function passwordProblem(value: string): string | null {
  if (value.length === 0) return "Choisis un mot de passe.";
  if (value.length < PASSWORD_MIN_LENGTH) {
    return `Ton mot de passe doit faire au moins ${PASSWORD_MIN_LENGTH} caractères.`;
  }
  return null;
}

/**
 * Traduit une erreur d'authentification en phrase utile.
 *
 * ⚠️ « Identifiants incorrects » reste volontairement flou sur ce qui est faux,
 * l'adresse ou le mot de passe. Distinguer les deux dirait à n'importe qui
 * quelles adresses ont un compte chez nous.
 */
export function authErrorMessage(message: string | undefined): string {
  const raw = (message ?? "").toLowerCase();

  if (raw.includes("invalid login credentials")) {
    return "Email ou mot de passe incorrect.";
  }
  if (raw.includes("already registered") || raw.includes("already been registered")) {
    return "Un compte existe déjà avec cet email. Connecte-toi plutôt.";
  }
  if (raw.includes("password should be at least") || raw.includes("password is too short")) {
    return `Ton mot de passe doit faire au moins ${PASSWORD_MIN_LENGTH} caractères.`;
  }
  if (raw.includes("email not confirmed")) {
    return "Ton compte n'est pas encore confirmé. Utilise « Mot de passe oublié » pour recevoir un code.";
  }
  if (raw.includes("unable to validate email") || raw.includes("invalid email")) {
    return "Cette adresse email n'est pas valide.";
  }
  if (raw.includes("rate limit") || raw.includes("too many")) {
    return "Trop de tentatives. Attends une minute avant de réessayer.";
  }
  if (raw.includes("weak password")) {
    return "Ce mot de passe est trop courant. Choisis-en un autre.";
  }

  return "La connexion a échoué. Réessaie dans un instant.";
}
