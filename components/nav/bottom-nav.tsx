"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Barre de navigation basse : le repère standard sur mobile, à portée de pouce.
 * Ne référence que des routes existantes — un onglet mort coûte plus cher qu'un
 * onglet manquant.
 */
const TABS = [
  { href: "/dashboard", label: "Accueil", icon: HomeIcon },
  { href: "/analyze", label: "Analyser", icon: CameraIcon },
  { href: "/dressing", label: "Dressing", icon: HangerIcon },
  { href: "/shopping", label: "Acheter", icon: BagIcon },
  { href: "/history", label: "Progrès", icon: ChartIcon },
] as const;

export function BottomNav() {
  const pathname = usePathname();
  const activeIndex = TABS.findIndex(
    (tab) => pathname === tab.href || pathname.startsWith(`${tab.href}/`)
  );

  /**
   * L'onglet qu'on vient de toucher, avant même que la page ait changé.
   *
   * ⚠️ Sans ça, la pastille ne bouge qu'au moment où la nouvelle page est
   * validée par le routeur — mesuré : rien n'avait bougé 120 ms après le tap.
   * Or c'est précisément l'inverse de ce qu'on cherche : le mouvement doit
   * répondre au DOIGT, pas au serveur. Un repère qui attend la page ne rassure
   * personne — il confirme au contraire que l'app rame.
   *
   * `pathname` reste la vérité : on retient la page d'OÙ l'on est parti, et dès
   * qu'elle change, cette avance est effacée — la pastille se recale sur la page
   * réellement affichée. Retour arrière du navigateur compris.
   *
   * Le nettoyage se fait pendant le rendu, pas dans un `useEffect`. C'est la
   * façon dont React demande d'ajuster un état devenu caduc : il refait le rendu
   * immédiatement, avant de peindre. Depuis un effet, l'écran afficherait une
   * image de trop — celle où la page a changé mais pas la pastille.
   */
  const [tap, setTap] = useState<{ href: string; from: string } | null>(null);
  if (tap && tap.from !== pathname) setTap(null);
  const tappedIndex = tap ? TABS.findIndex((tab) => tab.href === tap.href) : -1;

  return (
    <nav
      // Ni `fixed`, ni `sticky` : un élément normal, dernière ligne d'une coque
      // qui ne défile pas (voir `app/(dashboard)/layout.tsx`).
      //
      // Les deux positionnements ont été essayés et bougent tous les deux sur
      // iOS : `sticky` suit le flux, et `fixed` suit le rebond élastique que
      // Safari applique au document entier pendant le défilement. Aucun réglage
      // CSS ne corrige ça. La seule chose qui le rend IMPOSSIBLE, c'est que le
      // document ne défile plus : le défilement a lieu dans le cadre au-dessus,
      // et cette barre est simplement posée en dessous.
      //
      // Fond opaque : rien ne transparaît, donc rien ne scintille.
      className="z-30 w-full flex-none border-t border-border bg-background"
      // Respecte la zone tactile réservée par iOS en bas d'écran.
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {/* Ce cadre `relative` est la référence de la pastille glissante. Il doit
          entourer les onglets SEULS : posé sur le <nav>, il engloberait aussi la
          marge basse d'iOS, et la pastille descendrait de la hauteur de cette
          marge — d'autant plus bas que le téléphone a une encoche. */}
      <div className="relative flex w-full">
        <SlidingPill index={tappedIndex >= 0 ? tappedIndex : activeIndex} />
        {TABS.map((tab) => {
          const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? "page" : undefined}
              // `pointerDown` et non `click` : sur mobile, le clic n'est émis
              // qu'au relâchement du doigt. Une centaine de millisecondes de
              // gagnées, gratuitement, sur le seul geste qui compte ici.
              onPointerDown={() => setTap({ href: tab.href, from: pathname })}
              // Le geste s'est transformé en autre chose (le système a repris
              // le doigt) : il n'y aura pas de navigation, on remet la pastille
              // là où elle était.
              //
              // ⚠️ Ne PAS ajouter `onPointerLeave` ici « pour bien faire » : au
              // toucher, le doigt capture l'élément, et l'événement de sortie
              // n'arrive qu'APRÈS le relâchement — y compris quand on relâche
              // au bon endroit. La pastille reviendrait en arrière pile au
              // moment du tap réussi.
              onPointerCancel={() => setTap(null)}
              // La hauteur vient de la même variable que la place réservée dans
              // le contenu (voir `app/(dashboard)/layout.tsx`) : les laisser
              // diverger cacherait le dernier élément de la page.
              // `touch-action: manipulation` supprime le délai de 300 ms hérité
              // du double-tap et le zoom accidentel : sur une barre d'onglets, un
              // tap doit partir immédiatement.
              style={{
                minHeight: "var(--bottom-nav-height)",
                touchAction: "manipulation",
              }}
              // `relative` : sans lui, les onglets ne sont pas positionnés et la
              // pastille — qui l'est — se peindrait PAR-DESSUS les icônes.
              className={`relative flex flex-1 flex-col items-center justify-center gap-1 pt-1.5 text-[11px] font-semibold transition-colors ${
                active ? "text-accent-strong" : "text-muted"
              }`}
            >
              {/* La boîte de la pastille reste ici, vide : c'est elle qui donne sa
                  place à l'icône. La couleur, elle, est peinte par l'unique
                  pastille glissante posée derrière. */}
              <span className="flex h-7 w-12 items-center justify-center">
                <Icon active={active} />
              </span>
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

/**
 * La pastille violette de l'onglet actif — une seule, qui GLISSE.
 *
 * ⚠️ Pourquoi une pastille unique plutôt que cinq fonds qu'on allume et qu'on
 * éteint : cinq fonds ne peuvent que s'estomper l'un dans l'autre, ce qui se lit
 * comme un clignotement. Un objet qui se déplace, lui, relie visuellement
 * l'onglet quitté à l'onglet touché — c'est ce mouvement qui donne à l'app son
 * ressenti « natif », et il est gratuit : ni requête, ni rendu, ni latence.
 *
 * ── Comment elle tombe pile au bon endroit, sans mesurer quoi que ce soit ──
 *
 * Horizontalement : les onglets sont en `flex-1` avec une base nulle, donc
 * exactement à un cinquième chacun. La pastille vit dans une case `w-1/5` et se
 * décale de `index × 100 %` de SA propre largeur — soit exactement une case.
 *
 * Verticalement : la case rejoue les mêmes classes de mise en page que les
 * onglets (`justify-center gap-1 pt-1.5`) et contient les deux mêmes boîtes —
 * la pastille et une ligne de texte. Même recette, même résultat : la pastille
 * se cale d'elle-même sur les icônes, et elle y reste si la hauteur de la barre
 * ou la taille du libellé changent un jour. Une valeur `top` codée en dur, elle,
 * se serait décalée en silence à la première de ces retouches.
 */
function SlidingPill({ index }: { index: number }) {
  // Aucun onglet ne correspond (réglages, facturation…) : pas de pastille du
  // tout. La laisser sous « Accueil » désignerait une page où l'on n'est pas.
  if (index < 0) return null;

  return (
    <div className="pointer-events-none absolute inset-0 flex" aria-hidden>
      <div
        className="flex w-1/5 flex-col items-center justify-center gap-1 pt-1.5 text-[11px] font-semibold transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
        style={{ transform: `translateX(${index * 100}%)` }}
      >
        <span className="h-7 w-12 rounded-full bg-accent-soft" />
        {/* Cale invisible : elle occupe la ligne du libellé pour que le
            centrage vertical soit celui des onglets, au pixel près. */}
        <span className="invisible">A</span>
      </div>
    </div>
  );
}

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

/** Analyser — l'appareil photo, puisque tout commence par une photo de la tenue. */
function CameraIcon({ active }: { active: boolean }) {
  return (
    <svg {...iconProps(active)}>
      <rect x="2.7" y="7.5" width="18.6" height="12.9" rx="3.4" />
      <path d="M8.8 7.5 10.1 5h3.8l1.3 2.5" />
      <circle cx="12" cy="13.9" r="3.2" />
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
