// Jeu d'icônes maison : traits de 1.6, coins arrondis, grille 24.
//
// Dessinées à la main plutôt qu'importées d'une librairie : il en faut une
// vingtaine, elles pèsent quelques lignes chacune, et ça évite une
// dépendance de plus pour des chemins SVG.

type IconProps = {
  className?: string;
  strokeWidth?: number;
};

function Base({
  children,
  className = "h-5 w-5",
  strokeWidth = 1.6,
}: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export const IconHome = (p: IconProps) => (
  <Base {...p}>
    <path d="M3 10.5 12 3l9 7.5" />
    <path d="M5.5 9.5V20a1 1 0 0 0 1 1H10v-6h4v6h3.5a1 1 0 0 0 1-1V9.5" />
  </Base>
);

export const IconEuro = (p: IconProps) => (
  <Base {...p}>
    <path d="M17 6.5A6 6 0 0 0 7.5 12a6 6 0 0 0 9.5 5.5" />
    <path d="M4 10.5h8M4 13.5h8" />
  </Base>
);

export const IconStore = (p: IconProps) => (
  <Base {...p}>
    <path d="M4 9.5 5.2 4h13.6L20 9.5" />
    <path d="M4 9.5a2.4 2.4 0 0 0 4 1.6 2.4 2.4 0 0 0 4 0 2.4 2.4 0 0 0 4 0 2.4 2.4 0 0 0 4-1.6" />
    <path d="M5.5 12v7a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1v-7" />
    <path d="M10 20v-4h4v4" />
  </Base>
);

export const IconChat = (p: IconProps) => (
  <Base {...p}>
    <path d="M20 12.5c0 3.6-3.6 6.5-8 6.5a9.6 9.6 0 0 1-2.6-.35L5 21l1.1-3.2C4.8 16.6 4 14.7 4 12.5 4 8.9 7.6 6 12 6s8 2.9 8 6.5Z" />
  </Base>
);

export const IconUser = (p: IconProps) => (
  <Base {...p}>
    <circle cx="12" cy="8.5" r="3.5" />
    <path d="M5 20c.7-3.4 3.5-5.5 7-5.5s6.3 2.1 7 5.5" />
  </Base>
);

export const IconUsers = (p: IconProps) => (
  <Base {...p}>
    <circle cx="9.5" cy="8.5" r="3.2" />
    <path d="M3.5 19.5c.6-3.1 3-5 6-5s5.4 1.9 6 5" />
    <path d="M16 5.6a3.2 3.2 0 0 1 0 6" />
    <path d="M17.5 14.9c2 .6 3.4 2.2 3.9 4.6" />
  </Base>
);

export const IconCards = (p: IconProps) => (
  <Base {...p}>
    <rect x="2.5" y="6.5" width="14" height="11" rx="2" />
    <path d="M6 10.5h3.5M6 13.5h5.5" />
    <path d="M19 8.2a2 2 0 0 1 2.5 1.9v6.4a2 2 0 0 1-2 2H8.2" />
  </Base>
);

export const IconBox = (p: IconProps) => (
  <Base {...p}>
    <path d="M3.5 7.8 12 3.5l8.5 4.3v8.4L12 20.5l-8.5-4.3V7.8Z" />
    <path d="M3.5 7.8 12 12l8.5-4.2M12 12v8.5" />
  </Base>
);

export const IconChart = (p: IconProps) => (
  <Base {...p}>
    <path d="M4 20V4" />
    <path d="M4 20h16" />
    <path d="M8 16.5v-4M12.5 16.5v-8M17 16.5v-5.5" />
  </Base>
);

export const IconSettings = (p: IconProps) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M12 2.8v2.3M12 18.9v2.3M4.5 4.5l1.6 1.6M17.9 17.9l1.6 1.6M2.8 12h2.3M18.9 12h2.3M4.5 19.5l1.6-1.6M17.9 6.1l1.6-1.6" />
  </Base>
);

export const IconShield = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 3 19 6v5.5c0 4.2-2.9 7.6-7 9.5-4.1-1.9-7-5.3-7-9.5V6l7-3Z" />
    <path d="M9.2 12.2l2 2 3.6-3.8" />
  </Base>
);

export const IconBell = (p: IconProps) => (
  <Base {...p}>
    <path d="M18 9a6 6 0 1 0-12 0c0 4.2-1.5 5.6-1.5 5.6h15S18 13.2 18 9Z" />
    <path d="M10.3 18a2 2 0 0 0 3.4 0" />
  </Base>
);

export const IconPlus = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 5.5v13M5.5 12h13" />
  </Base>
);

export const IconPlay = (p: IconProps) => (
  <Base {...p}>
    <path d="M7.5 5.5 18 12 7.5 18.5V5.5Z" />
  </Base>
);

export const IconStop = (p: IconProps) => (
  <Base {...p}>
    <rect x="6" y="6" width="12" height="12" rx="2.5" />
  </Base>
);

export const IconClock = (p: IconProps) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 1.8" />
  </Base>
);

export const IconBack = (p: IconProps) => (
  <Base {...p}>
    <path d="M14.5 5.5 8 12l6.5 6.5" />
  </Base>
);

export const IconChevron = (p: IconProps) => (
  <Base {...p}>
    <path d="M9.5 5.5 16 12l-6.5 6.5" />
  </Base>
);

export const IconSend = (p: IconProps) => (
  <Base {...p}>
    <path d="M20 4 3.5 10.8l6.6 2.6 2.6 6.6L20 4Z" />
    <path d="m10.1 13.4 4-4" />
  </Base>
);

export const IconCheck = (p: IconProps) => (
  <Base {...p}>
    <path d="m5 12.5 4.5 4.5L19 7" />
  </Base>
);

export const IconFlame = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 21c3.3 0 6-2.5 6-5.8 0-4.2-4.2-5.9-3.4-10.2-2.2.6-4 2.6-4.3 5.1-1-.6-1.6-1.6-1.8-2.8C7 8.6 6 10.9 6 13.2 6 17.1 8.7 21 12 21Z" />
  </Base>
);

export const IconTarget = (p: IconProps) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <circle cx="12" cy="12" r="4.5" />
    <circle cx="12" cy="12" r="1" fill="currentColor" />
  </Base>
);

export const IconLogout = (p: IconProps) => (
  <Base {...p}>
    <path d="M14 5.5H6.5a1 1 0 0 0-1 1v11a1 1 0 0 0 1 1H14" />
    <path d="M17 8.5 20.5 12 17 15.5M20 12h-9" />
  </Base>
);

export const IconCamera = (p: IconProps) => (
  <Base {...p}>
    <path d="M4 8.5h3l1.3-2h7.4l1.3 2h3a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1Z" />
    <circle cx="12" cy="13.5" r="3.2" />
  </Base>
);

export const IconTrash = (p: IconProps) => (
  <Base {...p}>
    <path d="M4.5 7h15M9.5 7V5.2a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1V7" />
    <path d="M6.5 7l.8 12a1 1 0 0 0 1 .9h7.4a1 1 0 0 0 1-.9l.8-12" />
  </Base>
);

export const IconEdit = (p: IconProps) => (
  <Base {...p}>
    <path d="M4.5 19.5h4L19 9a2.1 2.1 0 0 0-3-3L4.5 17.5v2Z" />
    <path d="m14.5 6.5 3 3" />
  </Base>
);

export const IconPhone = (p: IconProps) => (
  <Base {...p}>
    <path d="M7.5 3.5 9.8 8l-2 1.8a11 11 0 0 0 6.4 6.4l1.8-2 4.5 2.3v3a2 2 0 0 1-2.2 2C10.6 21 3 13.4 2.2 5.7A2 2 0 0 1 4.2 3.5h3.3Z" />
  </Base>
);

export const IconMap = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 21s6.5-6 6.5-10.5a6.5 6.5 0 1 0-13 0C5.5 15 12 21 12 21Z" />
    <circle cx="12" cy="10.5" r="2.5" />
  </Base>
);
