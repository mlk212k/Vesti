/**
 * Code de connexion à 6 chiffres.
 *
 * Pourquoi un code et pas un lien : sur iOS, une app installée sur l'écran
 * d'accueil a son propre stockage, séparé de Safari. Un lien de connexion
 * s'ouvre depuis la boîte mail, donc dans Safari, et y crée la session — l'app
 * installée, elle, reste déconnectée. Le code se tape à l'intérieur de l'app :
 * rien ne sort du conteneur, et le problème disparaît.
 */

export const OTP_LENGTH = 6;

/**
 * Types de jeton à essayer à la vérification, dans l'ordre.
 *
 * Supabase ne range pas le code au même endroit selon la personne : une adresse
 * déjà inscrite déclenche un `user_recovery_requested` (jeton « magiclink »),
 * une adresse neuve un `user_confirmation_requested` (jeton « signup »). Le type
 * générique `email` couvre normalement les deux, mais les journaux de
 * production montrent des codes fraîchement émis — seize secondes — rejetés en
 * « token has expired or is invalid », ce qui est la réponse de Supabase quand
 * le type ne correspond pas.
 *
 * Plutôt que de parier sur un type, on les essaie tous. Un essai qui échoue ne
 * consomme rien : seul celui qui réussit ouvre la session. Le coût est d'au
 * plus deux requêtes supplémentaires, et uniquement quand le code est faux.
 */
export const OTP_VERIFY_TYPES = ["email", "magiclink", "signup"] as const;

export type OtpVerifyType = (typeof OTP_VERIFY_TYPES)[number];

/** Délai avant de pouvoir redemander un code. Supabase limite à 60 s. */
export const RESEND_COOLDOWN_SECONDS = 60;

/**
 * Ne garde que les chiffres, tronqué à la longueur du code.
 *
 * Les gens ne tapent pas un code : ils le collent. Et ce qu'ils collent vient
 * d'un mail, donc avec ce qui l'entoure — « 123 456 », « Code : 123456 », un
 * espace insécable, un retour à la ligne. Tout nettoyer ici évite de leur
 * renvoyer « code invalide » alors qu'ils ont collé le bon.
 */
export function normalizeOtp(input: string): string {
  return input.replace(/\D/g, "").slice(0, OTP_LENGTH);
}

export function isOtpComplete(code: string): boolean {
  return normalizeOtp(code).length === OTP_LENGTH;
}

/**
 * Messages d'erreur de Supabase traduits en langage humain.
 *
 * On ne distingue pas « code faux » de « code expiré » côté message : dans les
 * deux cas la seule chose à faire est d'en redemander un, et être plus précis
 * renseignerait un attaquant sur la validité d'une adresse.
 */
export function otpErrorMessage(raw: string | undefined): string {
  const message = (raw ?? "").toLowerCase();

  if (message.includes("expired") || message.includes("invalid")) {
    return "Ce code n'est plus valable. Demande-en un nouveau.";
  }
  if (message.includes("rate limit") || message.includes("too many")) {
    return "Trop de tentatives. Attends une minute avant de réessayer.";
  }
  return "La vérification a échoué. Réessaie dans un instant.";
}
