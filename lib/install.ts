/**
 * Porte d'entrée « installe l'app sur ton écran d'accueil ».
 *
 * Fonctions pures : toute la détection se teste sans navigateur.
 *
 * ── Ce qu'il faut savoir avant de toucher à ce fichier ──────────────────────
 *
 * 1. On ne peut PAS savoir si quelqu'un a installé l'app. Aucune API ne le dit.
 *    Ce qu'on sait détecter, c'est que la page est *ouverte depuis* l'icône de
 *    l'écran d'accueil (`display-mode: standalone`). C'est le signal qu'on
 *    utilise : l'utilisateur passe la porte en revenant par l'icône, pas en
 *    cliquant un bouton « c'est fait ».
 *
 * 2. Le navigateur intégré de TikTok ne sait pas installer une app. Ni celui
 *    d'Instagram, de Snapchat ou de Facebook. Le trafic venant de TikTok, une
 *    porte sans issue de secours bloquerait tout le monde : d'où l'étape 0,
 *    « ouvre cette page dans Safari/Chrome », avant l'installation.
 */

/**
 * Interrupteur de la porte « écran d'accueil ».
 *
 * La porte n'a de sens que si l'on peut se connecter SANS quitter l'app
 * installée — donc uniquement par le code à 6 chiffres. Elle est restée à
 * `false` le temps que les modèles d'email Supabase portent `{{ .Token }}` :
 * sans code, la seule voie était le lien du mail, qui s'ouvre dans le
 * navigateur, que la porte bloque. Fermer avant d'avoir la clé enferme tout le
 * monde dehors — c'est arrivé, d'où ce commentaire.
 *
 * Le modèle « Magic Link » envoie maintenant un code : la porte peut fermer.
 *
 * ⚠️ Si tu la remets à `false` un jour, vérifie d'abord qu'un mail arrive
 * réellement avec 6 chiffres, sur une adresse déjà inscrite ET sur une adresse
 * neuve — Supabase n'utilise pas le même modèle dans les deux cas.
 */
export const INSTALL_GATE_ENABLED = true;

export type Os = "ios" | "android" | "other";

/** Applications dont le navigateur intégré ne sait pas installer de PWA. */
const IN_APP_BROWSERS: { pattern: RegExp; name: string }[] = [
  // TikTok signe ses webviews de plusieurs façons selon la plateforme et la
  // version : `musical_ly` (iOS), `trill` (Android), `BytedanceWebview` (les
  // deux). Il faut les trois — c'est la source de trafic principale.
  { pattern: /BytedanceWebview|musical_ly|\btrill\b|TikTok/i, name: "TikTok" },
  { pattern: /Instagram/i, name: "Instagram" },
  { pattern: /FBAN|FBAV|FB_IAB|FBIOS/i, name: "Facebook" },
  { pattern: /Messenger/i, name: "Messenger" },
  { pattern: /Snapchat/i, name: "Snapchat" },
  { pattern: /\bLine\//i, name: "LINE" },
  { pattern: /LinkedInApp/i, name: "LinkedIn" },
  { pattern: /Pinterest/i, name: "Pinterest" },
  { pattern: /Twitter/i, name: "X" },
];

export interface BrowserEnvironment {
  os: Os;
  /** Nom de l'application dont le navigateur intégré nous retient, ou `null`. */
  inAppBrowser: string | null;
  /**
   * L'installation est-elle possible ici et maintenant ? Faux dans un
   * navigateur intégré (aucun menu pour le faire) et sur ordinateur (l'app est
   * conçue pour un téléphone).
   */
  canInstallHere: boolean;
}

export function detectEnvironment(input: {
  userAgent: string;
  /** `navigator.maxTouchPoints` : seul moyen de distinguer un iPad d'un Mac. */
  maxTouchPoints?: number;
}): BrowserEnvironment {
  const ua = input.userAgent;

  // Depuis iPadOS 13, un iPad se déclare « Macintosh ». Le nombre de points de
  // contact est ce qui les sépare : un Mac en annonce 0.
  const isIpadOs =
    /Macintosh/i.test(ua) && (input.maxTouchPoints ?? 0) > 1;

  const os: Os = /iPhone|iPad|iPod/i.test(ua) || isIpadOs
    ? "ios"
    : /Android/i.test(ua)
      ? "android"
      : "other";

  const match = IN_APP_BROWSERS.find((entry) => entry.pattern.test(ua));
  const inAppBrowser = match?.name ?? null;

  return {
    os,
    inAppBrowser,
    canInstallHere: inAppBrowser === null && os !== "other",
  };
}

/**
 * Chemins que la porte ne doit jamais bloquer.
 *
 * Ce ne sont pas des exceptions de confort : chacune casserait quelque chose.
 *
 *  - `/auth/callback` : le lien de connexion arrive par mail et s'ouvre dans le
 *    navigateur, jamais depuis l'icône. Le bloquer rendrait la connexion
 *    impossible pour tout le monde.
 *  - les pages légales : les CGV et les mentions doivent rester accessibles
 *    publiquement, avant tout achat. Les mettre derrière une porte est un
 *    problème juridique, pas un choix de design.
 *  - `/admin` : le back-office se consulte sur un ordinateur.
 */
const OPEN_PATHS = [
  "/auth/callback",
  "/mentions-legales",
  "/cgv",
  "/confidentialite",
  "/admin",
];

export function isOpenPath(pathname: string): boolean {
  return OPEN_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );
}
