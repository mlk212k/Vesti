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
 * ── OUVERTE, et c'est la mesure qui l'a décidé ──────────────────────────────
 *
 * Trois jours de Web Analytics, du 12 au 14 septembre 2026 :
 *
 *   /        194 visiteurs     ← l'écran d'installation, que tout le monde voit
 *   /login     6 visiteurs     ← derrière la porte : uniquement ceux qui ont
 *                                installé PUIS sont revenus par l'icône
 *   inscrits   5
 *
 * Soit **3 % de franchissement**. Ce n'est pas une estimation : `/login` étant
 * lui aussi derrière la porte, ces 6 visiteurs SONT la mesure exacte des gens
 * qui ont réussi l'installation.
 *
 * Pire, 167 de ces 194 venaient de tiktok.com — donc du navigateur intégré de
 * TikTok, qui ne sait pas installer de PWA (voir `IN_APP_BROWSERS`). Pour eux,
 * la porte imposait sept étapes avant d'avoir rien vu de l'app : sortir de
 * TikTok, trouver le bouton ⋯, ouvrir dans Safari, bouton Partager, ajouter à
 * l'écran d'accueil, retrouver l'icône, l'ouvrir. On demandait un engagement
 * avant d'avoir montré la moindre valeur.
 *
 * ⚠️ Ce qui est abandonné ici, c'est la PORTE, pas la PWA. Le manifeste,
 * l'icône et l'installation restent entiers — l'app s'installe toujours, et
 * l'icône sur l'écran d'accueil reste le meilleur outil de rétention dont on
 * dispose. Ce qui change, c'est le MOMENT où on la propose : après la première
 * analyse, quand la personne a vu son verdict et a une raison de revenir, et
 * non en péage à l'entrée.
 *
 * ── Ce que la réouverture change, et qu'il ne faut pas redécouvrir ──────────
 *
 *  - La connexion Google redevient disponible sur iPhone. `googleWorksHere`
 *    dans le formulaire de connexion vaut `!(launchedFromIcon && isIos)` : hors
 *    app installée, le cas qui cassait la session PKCE n'existe pas.
 *  - Le parrainage n'est pas affecté : le code arrive par `?ref=` et le proxy
 *    le pose en cookie dès la première page, installée ou non.
 *  - La connexion par code à 6 chiffres reste en place et reste nécessaire le
 *    jour où la porte refermerait.
 *
 * 🔁 Pour refermer : repasser à `true`. Vérifier d'abord qu'un mail arrive
 * réellement avec 6 chiffres, sur une adresse déjà inscrite ET sur une adresse
 * neuve — Supabase n'utilise pas le même modèle dans les deux cas. Fermer sans
 * cette clé enferme tout le monde dehors ; c'est déjà arrivé.
 */
export const INSTALL_GATE_ENABLED = false;

/**
 * Le SEUL mode d'affichage qui prouve un lancement depuis l'icône.
 *
 * ⚠️ Il y en avait trois : `standalone`, `fullscreen` et `minimal-ui`. Les deux
 * derniers ont causé un vrai défaut, constaté chez une utilisatrice iPhone.
 *
 * `minimal-ui` veut dire « un navigateur à barre réduite » — c'est-à-dire
 * exactement le navigateur intégré d'Instagram, de Google ou d'un client mail.
 * La porte le prenait pour l'app installée, ouvrait l'app dans ce webview, et
 * la connexion Google s'y perdait : cinq allers-retours en 90 secondes,
 * `/token 200` au milieu, et retour à la page d'accueil à chaque fois.
 *
 * `fullscreen` ne peut de toute façon jamais arriver : le manifeste déclare
 * `display: standalone`, donc une Vesti réellement installée annonce
 * `standalone` et rien d'autre. Le garder n'ouvrait qu'une porte de plus.
 */
export const INSTALLED_DISPLAY_MODES = ["standalone"] as const;

/**
 * Ces modes d'affichage désignent-ils une app lancée depuis l'écran d'accueil ?
 *
 * Prend la liste des modes qui correspondent réellement, pour que la décision
 * se teste sans navigateur.
 */
export function isInstalledDisplayMode(modes: readonly string[]): boolean {
  return modes.some((mode) =>
    (INSTALLED_DISPLAY_MODES as readonly string[]).includes(mode)
  );
}

export type Os = "ios" | "android" | "other";

/**
 * Applications dont le navigateur intégré ne sait pas installer de PWA.
 *
 * `menuCorner` : où se trouve le bouton ⋯ qui permet d'en sortir. Il n'est
 * renseigné QUE pour les apps où il a été constaté. Ailleurs il vaut `null`, et
 * la page dit « dans un coin de l'écran » au lieu d'envoyer regarder à un
 * endroit précis qui serait peut-être le mauvais — le même défaut, exactement,
 * que la flèche qui désignait la barre d'outils de Safari chez les autres.
 *
 * ⚠️ La position dépend du COUPLE app + système, pas de l'app seule : la même
 * application range ce bouton en bas sur iPhone et en haut sur Android. D'où
 * deux entrées séparées et non une valeur unique.
 */
const IN_APP_BROWSERS: {
  pattern: RegExp;
  name: string;
  menuCorner?: { ios?: string; android?: string };
}[] = [
  // TikTok signe ses webviews de plusieurs façons selon la plateforme et la
  // version : `musical_ly` (iOS), `trill` (Android), `BytedanceWebview` (les
  // deux). Il faut les trois — c'est la source de trafic principale.
  {
    pattern: /BytedanceWebview|musical_ly|\btrill\b|TikTok/i,
    name: "TikTok",
    menuCorner: {
      ios: "en bas à droite de l'écran",
      android: "en haut à droite de l'écran",
    },
  },
  // L'app Google — celle où l'on tape une recherche, pas Chrome. Ouvrir un
  // résultat y ouvre SON navigateur intégré, qui ne sait pas installer d'app.
  //
  // ⚠️ Son agent utilisateur ne porte AUCUN suffixe de navigateur : sur iPhone
  // il ressemble trait pour trait à celui de Safari, à `GSA/` près. Sans cette
  // ligne il passait donc pour Safari, et la page lui montrait la flèche
  // « c'est ce bouton » en désignant une barre d'outils qui n'est pas la
  // sienne. C'est exactement le défaut que la flèche devait éviter.
  { pattern: /\bGSA\//i, name: "Google" },
  { pattern: /Instagram/i, name: "Instagram" },
  { pattern: /FBAN|FBAV|FB_IAB|FBIOS/i, name: "Facebook" },
  { pattern: /Messenger/i, name: "Messenger" },
  { pattern: /Snapchat/i, name: "Snapchat" },
  { pattern: /\bLine\//i, name: "LINE" },
  { pattern: /LinkedInApp/i, name: "LinkedIn" },
  { pattern: /Pinterest/i, name: "Pinterest" },
  { pattern: /Twitter/i, name: "X" },
];

/**
 * Navigateurs iOS qui ne sont PAS Safari.
 *
 * Sur iPhone, tous utilisent le même moteur : leur nom n'apparaît que sous
 * forme de suffixe dans l'agent utilisateur. Chrome se signe `CriOS`, Firefox
 * `FxiOS`, Edge `EdgiOS`, Opera `OPiOS`. Safari, lui, n'ajoute rien — on le
 * reconnaît donc par élimination.
 */
const IOS_NON_SAFARI = /CriOS|FxiOS|EdgiOS|OPiOS|DuckDuckGo|Brave/i;

export interface BrowserEnvironment {
  os: Os;
  /** Nom de l'application dont le navigateur intégré nous retient, ou `null`. */
  inAppBrowser: string | null;
  /**
   * Où chercher le bouton ⋯ pour sortir de ce navigateur intégré, quand on le
   * sait. `null` quand on ne le sait pas : la page reste alors volontairement
   * vague plutôt que d'indiquer un coin au hasard.
   */
  inAppMenuCorner: string | null;
  /**
   * L'installation est-elle possible ici et maintenant ? Faux dans un
   * navigateur intégré (aucun menu pour le faire) et sur ordinateur (l'app est
   * conçue pour un téléphone).
   */
  canInstallHere: boolean;
  /**
   * Safari sur iPhone ou iPad, et lui seul.
   *
   * ⚠️ Sert à décider CE QU'ON OSE AFFIRMER sur la position du bouton Partager.
   *
   * Dans Chrome, Firefox et Edge iOS, il est toujours dans la barre d'adresse,
   * en haut : on peut le dire. Dans Safari, non — la barre d'outils se met en
   * bas ou en haut selon un réglage du téléphone (« Onglet unique »), que rien
   * ne permet de lire depuis une page. Là, on se contente de montrer l'icône.
   *
   * Une flèche animée désignait autrefois le bas de l'écran ; elle a été
   * retirée pour cette raison exacte. Faire chercher au mauvais endroit
   * quelqu'un qui suit les instructions est pire que ne rien montrer.
   */
  isIosSafari: boolean;
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
    inAppMenuCorner:
      (os === "ios" || os === "android"
        ? match?.menuCorner?.[os]
        : undefined) ?? null,
    canInstallHere: inAppBrowser === null && os !== "other",
    // Un navigateur intégré est exclu d'office : il tourne sur le moteur de
    // Safari et ne porte aucun suffixe, mais sa barre d'outils n'est pas celle
    // de Safari — il n'a pas de bouton Partager du tout.
    isIosSafari: os === "ios" && inAppBrowser === null && !IOS_NON_SAFARI.test(ua),
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
