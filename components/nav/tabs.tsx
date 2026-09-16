import type { ComponentType } from "react";

/**
 * Les onglets et leurs icônes, à un seul endroit.
 *
 * ⚠️ EXTRAITS DE `bottom-nav.tsx` parce qu'une SECONDE barre les utilise
 * désormais — celle qui s'appuie sur le Dock d'unlumen-ui. Deux copies de cette
 * liste dériveraient à la première retouche : un onglet ajouté d'un côté
 * laisserait l'autre barre pointer sur quatre pages pendant que l'app en compte
 * cinq, sans qu'aucune erreur ne se déclenche.
 *
 * C'est la quatrième duplication évitée dans ce code, après la chaîne du
 * bouton, le triplet du panneau et le bandeau de score. Les trois précédentes
 * ont été payées avant d'être vues.
 */
export interface NavTab {
  href: string;
  label: string;
  icon: ComponentType<{ active: boolean }>;
}

/**
 * Ne référence que des routes existantes — un onglet mort coûte plus cher qu'un
 * onglet manquant.
 */
export const NAV_TABS: readonly NavTab[] = [
  { href: "/dashboard", label: "Accueil", icon: HomeIcon },
  { href: "/dressing", label: "Dressing", icon: HangerIcon },
  { href: "/shopping", label: "Acheter", icon: BagIcon },
  { href: "/history", label: "Progrès", icon: ChartIcon },
  // ⚠️ « Analyser » occupait cette barre alors que l'accueil porte déjà le
  // bouton « Analyser une tenue », en grand, au-dessus de la ligne de flottaison.
  // Un onglet qui double une action déjà visible ne fait pas gagner un tap : il
  // occupe un cinquième de la barre, où il empêchait les réglages d'exister.
  { href: "/compte", label: "Paramètres", icon: SlidersIcon },
] as const;

/**
 * Les cinq icônes, dessinées sur la même grammaire que le logo : uniquement des
 * traits d'épaisseur constante, à bouts et jonctions ronds, et des angles
 * largement adoucis. Le logo n'est fait que de cercles et de traits arrondis ;
 * des icônes à angles vifs au bas du même écran se verraient comme une pièce
 * rapportée.
 *
 * Toutes sont cadrées dans la même grille 24×24 avec ~3 unités de marge, pour
 * qu'elles paraissent de la même taille une fois côte à côte. C'est le poids
 * optique qui compte, pas la boîte : un carré et un cercle de mêmes dimensions
 * ne pèsent pas pareil à l'œil.
 */
function iconProps(active: boolean) {
  return {
    width: 22,
    height: 22,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    // L'onglet actif épaissit le trait : le repère tient encore quand la
    // couleur ne se voit pas — plein soleil, ou daltonisme.
    strokeWidth: active ? 2.1 : 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
}

/** Accueil — une maison, avec une porte : sans elle, la forme se lit « tente ». */
function HomeIcon({ active }: { active: boolean }) {
  return (
    <svg {...iconProps(active)}>
      <path d="M3.6 10.4 12 3.9l8.4 6.5" />
      <path d="M5.8 9.3v9.5a2 2 0 0 0 2 2h8.4a2 2 0 0 0 2-2V9.3" />
      <path d="M9.9 20.8v-4.1a2.1 2.1 0 0 1 4.2 0v4.1" />
    </svg>
  );
}

/**
 * Dressing — un cintre. L'ancien dessin était cassé : son crochet partait d'un
 * arc mal fermé et se lisait comme un trait perdu au-dessus du triangle.
 */
function HangerIcon({ active }: { active: boolean }) {
  return (
    <svg {...iconProps(active)}>
      <path d="M12 9.6V8.2a2.3 2.3 0 1 1 2.3-2.3" />
      <path d="M12 9.6 4.2 16.1a1.5 1.5 0 0 0 .96 2.65h13.68a1.5 1.5 0 0 0 .96-2.65L12 9.6Z" />
    </svg>
  );
}

/** Acheter — le sac, pas le caddie : on achète une pièce, on ne remplit pas un panier. */
function BagIcon({ active }: { active: boolean }) {
  return (
    <svg {...iconProps(active)}>
      {/* Côtés droits plutôt qu'évasés : un sac qui se rétrécit vers le bas,
          surmonté d'une anse en demi-cercle, se lit comme une poubelle. */}
      <path d="M5.6 8.6h12.8v9.8a2.4 2.4 0 0 1-2.4 2.4H8a2.4 2.4 0 0 1-2.4-2.4V8.6Z" />
      <path d="M9.2 8.6V6.8a2.8 2.8 0 0 1 5.6 0v1.8" />
    </svg>
  );
}

/**
 * Paramètres — des curseurs, pas un engrenage.
 *
 * L'engrenage est le symbole attendu, mais il ne se dessine qu'avec des dents,
 * c'est-à-dire des angles vifs : au milieu de quatre icônes faites uniquement de
 * traits à bouts ronds, il se verrait comme une pièce rapportée. Deux curseurs
 * disent la même chose — « ce qui se règle » — dans la grammaire du logo.
 */
function SlidersIcon({ active }: { active: boolean }) {
  return (
    <svg {...iconProps(active)}>
      <path d="M4 8.2h16" />
      <path d="M4 15.8h16" />
      {/* Les molettes, décalées l'une par rapport à l'autre : alignées, on
          lirait un seul curseur coupé en deux plutôt que deux réglages. */}
      <circle cx="9.2" cy="8.2" r="2.5" />
      <circle cx="15.2" cy="15.8" r="2.5" />
    </svg>
  );
}

/**
 * Progrès — trois barres qui montent. La courbe en zigzag d'avant devenait
 * illisible à cette taille : à 22 px, trois traits verticaux se lisent d'un
 * coup d'œil là où une ligne brisée demande de la déchiffrer.
 */
function ChartIcon({ active }: { active: boolean }) {
  return (
    <svg {...iconProps(active)}>
      {/* Les barres montent jusqu'en haut de la grille : plus courtes, l'icône
          pesait moins que ses voisines et paraissait plus petite alors qu'elle
          occupait la même boîte. */}
      <path d="M4 20.4h16" />
      <path d="M8 20.4v-6" />
      <path d="M12 20.4v-10.2" />
      <path d="M16 20.4v-14" />
    </svg>
  );
}
