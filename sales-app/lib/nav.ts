import {
  IconBox,
  IconCards,
  IconChart,
  IconChat,
  IconClock,
  IconEuro,
  IconHome,
  IconSettings,
  IconShield,
  IconStore,
  IconUser,
  IconUsers,
} from "@/components/icons";
import type { Role } from "@/lib/types";

export type NavItem = {
  href: string;
  label: string;
  short: string;
  icon: (props: { className?: string; strokeWidth?: number }) => React.ReactNode;
  roles: Role[];
};

// Source unique de la navigation. La barre du bas (mobile) et la colonne de
// gauche (desktop) lisent la même liste : impossible qu'un onglet existe
// d'un côté et pas de l'autre.
//
// Ce filtrage est du confort d'affichage, pas une sécurité : chaque page
// refait son propre `requireRole`, et la base refuse de toute façon les
// lignes qui ne regardent pas la personne connectée.
export const NAV: NavItem[] = [
  {
    href: "/",
    label: "Tableau de bord",
    short: "Home",
    icon: IconHome,
    roles: ["admin", "manager", "member"],
  },
  {
    href: "/equipe",
    label: "Équipe",
    short: "Équipe",
    icon: IconUsers,
    roles: ["admin", "manager"],
  },
  {
    href: "/ventes",
    label: "Ventes",
    short: "Ventes",
    icon: IconEuro,
    roles: ["admin", "manager", "member"],
  },
  {
    href: "/commerces",
    label: "Commerces",
    short: "Commerces",
    icon: IconStore,
    roles: ["admin", "manager", "member"],
  },
  {
    href: "/cartes",
    label: "Mes cartes",
    short: "Cartes",
    icon: IconCards,
    roles: ["member"],
  },
  {
    href: "/stock",
    label: "Stock",
    short: "Stock",
    icon: IconBox,
    roles: ["admin", "manager"],
  },
  {
    href: "/historique",
    label: "Historique",
    short: "Historique",
    icon: IconClock,
    roles: ["admin", "manager", "member"],
  },
  {
    href: "/analytics",
    label: "Analytics",
    short: "Stats",
    icon: IconChart,
    roles: ["admin", "manager"],
  },
  {
    href: "/chat",
    label: "Chat",
    short: "Chat",
    icon: IconChat,
    roles: ["admin", "manager", "member"],
  },
  {
    href: "/membres",
    label: "Membres",
    short: "Membres",
    icon: IconUser,
    roles: ["admin"],
  },
  {
    href: "/parametres",
    label: "Paramètres",
    short: "Réglages",
    icon: IconSettings,
    roles: ["admin"],
  },
  {
    href: "/audit",
    label: "Audit",
    short: "Audit",
    icon: IconShield,
    roles: ["admin"],
  },
  {
    href: "/profil",
    label: "Profil",
    short: "Profil",
    icon: IconUser,
    roles: ["admin", "manager", "member"],
  },
];

export function navFor(role: Role): NavItem[] {
  return NAV.filter((item) => item.roles.includes(role));
}

// Les cinq onglets du bas sur mobile. Le commercial passe sa journée dessus,
// donc c'est son parcours qui décide : accueil, vendre, prospecter, parler,
// soi. L'encadrement a besoin de l'équipe et du stock à la place.
const MOBILE_MEMBER = ["/", "/ventes", "/commerces", "/chat", "/profil"];
const MOBILE_STAFF = ["/", "/equipe", "/stock", "/chat", "/profil"];

export function mobileNavFor(role: Role): NavItem[] {
  const wanted = role === "member" ? MOBILE_MEMBER : MOBILE_STAFF;
  return wanted
    .map((href) => NAV.find((item) => item.href === href))
    .filter((item): item is NavItem => Boolean(item));
}
