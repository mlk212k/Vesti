/**
 * Les réseaux de Vesti : Discord, Instagram, TikTok.
 *
 * ── Ce qu'un bouton peut faire, et ce qu'il ne peut pas ─────────────────────
 *
 * ⚠️ Aucun bouton ne peut inscrire quelqu'un dans un serveur Discord à sa
 * place. La seule voie qui le permettrait est l'API `guilds.join`, et elle
 * exige que la personne se connecte d'abord à Discord DEPUIS Vesti, autorise
 * une application, et qu'un bot ait la permission de l'ajouter — soit trois
 * écrans de plus, en anglais, pour arriver là où le lien mène en un tap.
 *
 * Ces liens sont donc ce qui se fait de plus direct : sur téléphone,
 * `discord.gg`, `instagram.com` et `tiktok.com` sont des liens universels. Le
 * système ouvre l'APPLICATION correspondante si elle est installée, sans passer
 * par une page web.
 */

export type SocialId = "discord" | "instagram" | "tiktok";

export interface SocialNetwork {
  id: SocialId;
  label: string;
  /** Ce qu'on y trouve. Sert de sous-titre dans les réglages. */
  hint: string;
  /**
   * `null` = ce compte n'existe pas encore.
   *
   * ⚠️ Une adresse inventée « en attendant » est pire que rien : elle mène à
   * une page « ce compte n'existe pas », qui donne l'impression d'une app
   * abandonnée. Une entrée sans adresse n'est simplement pas affichée — voir
   * `openNetworks()`.
   */
  url: string | null;
}

/**
 * Le code d'invitation Discord, séparé de l'URL.
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

export const SOCIAL_NETWORKS: SocialNetwork[] = [
  {
    id: "discord",
    label: "Discord",
    hint: "Partager ses tenues, demander un deuxième avis, voir les nouveautés en premier",
    url: DISCORD_INVITE_URL,
  },
  {
    id: "instagram",
    label: "Instagram",
    hint: "Les tenues du jour et les avant/après",
    // À remplir avec le vrai compte : `https://instagram.com/<pseudo>`.
    url: null,
  },
  {
    id: "tiktok",
    label: "TikTok",
    hint: "Les analyses en vidéo, et les pires tenues qu'on ait vues",
    // À remplir avec le vrai compte : `https://tiktok.com/@<pseudo>`.
    url: null,
  },
];

/** Les réseaux réellement ouverts, dans l'ordre où on veut les montrer. */
export function openNetworks(): (SocialNetwork & { url: string })[] {
  return SOCIAL_NETWORKS.filter(
    (network): network is SocialNetwork & { url: string } => network.url !== null
  );
}

/**
 * L'adresse est-elle bien celle d'un réseau qu'on affiche ?
 *
 * Sert de garde-fou au moment de la relecture : une constante qu'on modifie à
 * la main finit un jour collée de travers — un `http://`, un espace en trop, un
 * lien vers le mauvais domaine. Aucun de ces cas ne casse la compilation, tous
 * mènent l'utilisateur ailleurs que sur le bon compte.
 */
export function isSocialUrl(id: SocialId, url: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }

  // `https` seulement : un lien en clair depuis une app installée déclenche
  // l'avertissement du navigateur, au pire moment.
  if (parsed.protocol !== "https:") return false;

  const host = parsed.hostname.replace(/^www\./, "");
  const path = parsed.pathname.replace(/\/+$/, "");

  switch (id) {
    case "discord":
      if (host !== "discord.gg" && host !== "discord.com") return false;
      return /^\/(invite\/)?[A-Za-z0-9-]{2,32}$/.test(path);

    case "instagram":
      if (host !== "instagram.com") return false;
      // Les pseudos Instagram : lettres, chiffres, points et tirets bas.
      return /^\/[A-Za-z0-9._]{1,30}$/.test(path);

    case "tiktok":
      if (host !== "tiktok.com") return false;
      // ⚠️ L'arobase fait partie du chemin chez TikTok : `tiktok.com/@pseudo`.
      // Sans elle, l'adresse mène à une recherche, pas à un compte.
      return /^\/@[A-Za-z0-9._]{1,24}$/.test(path);
  }
}

/** Conservé pour la compatibilité : l'invitation Discord est un cas de réseau. */
export function isDiscordInvite(url: string): boolean {
  return isSocialUrl("discord", url);
}
