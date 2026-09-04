/**
 * Les marques des autres — Google, Discord, Instagram, TikTok.
 *
 * ⚠️ Elles ne suivent PAS la grammaire graphique de Vesti, et c'est délibéré.
 * Les icônes de l'app sont au trait fin, à bouts ronds, dérivées du logo. Une
 * marque tierce, elle, se reconnaît à sa silhouette exacte : la redessiner « à
 * la manière de Vesti » la rendrait méconnaissable, c'est-à-dire inutile. Un
 * logo sert à être identifié avant d'être lu, ou il ne sert à rien.
 *
 * Conséquence pratique : elles gardent leurs aplats et, pour Google, ses
 * couleurs figées.
 */

/**
 * Le « G » de Google, aux quatre couleurs officielles.
 *
 * ⚠️ Les couleurs sont écrites en dur, jamais `currentColor`. Deux raisons :
 * les conditions d'utilisation de Google demandent le logo tel quel sur un
 * bouton de connexion, et un « G » monochrome ne se reconnaît plus — c'est
 * justement le tramage des quatre couleurs qui le rend identifiable au coin de
 * l'œil.
 *
 * Elles tiennent sur les deux thèmes : le bouton est `secondary`, donc posé sur
 * une surface — blanche en clair, violet très sombre en sombre — et aucune des
 * quatre ne s'y perd.
 */
export function GoogleIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden focusable="false">
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5Z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65Z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19Z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48Z"
      />
    </svg>
  );
}

/** La manette de Discord, en aplat. */
export function DiscordIcon({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
      focusable="false"
    >
      <path d="M19.3 5.6a16.5 16.5 0 0 0-4.1-1.3l-.2.4a15 15 0 0 1 3.6 1.2 12.7 12.7 0 0 0-10.9 0 15 15 0 0 1 3.6-1.2l-.2-.4a16.5 16.5 0 0 0-4.1 1.3C4 9.4 3.3 13.1 3.6 16.7a16.7 16.7 0 0 0 5 2.5l.6-1a11 11 0 0 1-1.9-.9l.3-.3a11.9 11.9 0 0 0 10 0l.3.3c-.6.4-1.2.7-1.9.9l.6 1a16.6 16.6 0 0 0 5-2.5c.4-4.2-.6-7.9-2.3-11.1ZM9.4 14.5c-1 0-1.8-.9-1.8-2s.8-2 1.8-2 1.8.9 1.8 2-.8 2-1.8 2Zm5.2 0c-1 0-1.8-.9-1.8-2s.8-2 1.8-2 1.8.9 1.8 2-.8 2-1.8 2Z" />
    </svg>
  );
}

/**
 * L'appareil photo d'Instagram.
 *
 * Le seul des trois qui se dessine au trait — c'est ainsi que la marque le
 * définit. L'épaisseur est légèrement supérieure à celle des icônes de l'app
 * pour qu'il pèse pareil que Discord et TikTok, qui sont pleins.
 */
export function InstagramIcon({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      focusable="false"
    >
      <rect x="2.8" y="2.8" width="18.4" height="18.4" rx="5.2" />
      <circle cx="12" cy="12" r="4.1" />
      {/* Le point du flash, en haut à droite : sans lui, la forme se lit
          « photo » en général et plus « Instagram ». */}
      <circle cx="17.4" cy="6.6" r="1.15" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** La note de musique de TikTok, en aplat. */
export function TikTokIcon({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
      focusable="false"
    >
      <path d="M16.6 2h-3.2v13.2a2.6 2.6 0 1 1-2.6-2.6c.28 0 .55.04.8.12V9.4a6 6 0 0 0-.8-.06 6.25 6.25 0 1 0 6.25 6.25V9.05a7.4 7.4 0 0 0 4.35 1.4V7.15a4.2 4.2 0 0 1-2.9-1.2A4.35 4.35 0 0 1 16.6 2Z" />
    </svg>
  );
}
