/**
 * Le Discord de la communauté.
 *
 * ── Ce qu'un bouton peut faire, et ce qu'il ne peut pas ─────────────────────
 *
 * ⚠️ Aucun bouton ne peut inscrire quelqu'un dans un serveur Discord à sa
 * place. La seule voie qui le permettrait est l'API `guilds.join`, et elle
 * exige que la personne se connecte d'abord à Discord DEPUIS Vesti, autorise
 * une application, et qu'un bot ait la permission de l'ajouter — soit trois
 * écrans de plus, en anglais, pour arriver là où le lien mène en un tap.
 *
 * Ce lien est donc ce qui se fait de plus direct : sur téléphone, `discord.gg`
 * est un lien universel. Le système ouvre l'application Discord elle-même si
 * elle est installée, et il ne reste qu'à confirmer. Rien d'intermédiaire, pas
 * de page web à traverser.
 */

/**
 * Le code d'invitation, séparé de l'URL.
 *
 * ⚠️ Une invitation Discord peut EXPIRER, ou être révoquée depuis le serveur.
 * Le jour où celle-ci ne fonctionne plus, le bouton n'affichera aucune erreur
 * ici : il ouvrira Discord sur « Invitation invalide ». C'est donc une valeur à
 * revérifier quand on touche à ce fichier, pas une constante qu'on suppose
 * éternelle. Un lien permanent (sans expiration) se règle côté Discord, dans
 * les réglages du canal d'invitation.
 */
export const DISCORD_INVITE_CODE = "wephkW4rF";

export const DISCORD_INVITE_URL = `https://discord.gg/${DISCORD_INVITE_CODE}`;

/**
 * L'adresse est-elle bien une invitation Discord ?
 *
 * Sert de garde-fou au moment de la relecture : une constante qu'on modifie à
 * la main finit un jour collée de travers — un `http://`, un espace en trop, un
 * lien vers le mauvais domaine. Aucun de ces cas ne casse la compilation, tous
 * mènent l'utilisateur ailleurs que sur le serveur.
 */
export function isDiscordInvite(url: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }

  // `https` seulement : un lien en clair depuis une app installée déclenche
  // l'avertissement du navigateur, et l'invitation part en clair sur le réseau.
  if (parsed.protocol !== "https:") return false;

  const HOSTS = ["discord.gg", "discord.com", "www.discord.gg"];
  if (!HOSTS.includes(parsed.hostname)) return false;

  // Le code lui-même : au moins deux caractères, et rien d'autre après.
  const code = parsed.pathname.replace(/^\/(invite\/)?/, "");
  return /^[A-Za-z0-9-]{2,32}$/.test(code);
}
