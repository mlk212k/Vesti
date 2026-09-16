"use client";

import { useRouter, usePathname } from "next/navigation";
import { Dock } from "@/components/unlumen-ui/dock";
import { NAV_TABS, type NavTab } from "./tabs";

/**
 * La barre du bas, rendue avec le Dock d'unlumen-ui.
 *
 * ── ⚠️ CE QUE CETTE VERSION PERD PAR RAPPORT À `BottomNav` ──────────────────
 *
 * À lire avant de choisir laquelle brancher. Rien de tout cela n'est un défaut
 * d'intégration : ce sont les limites du composant de registre, qui est conçu
 * pour une souris.
 *
 *  1. LE GROSSISSEMENT SE DÉCLENCHE AU DOIGT, contrairement à ce qui était
 *     écrit ici d'abord. Il suit `onMouseMove`, et Safari sur iPhone SYNTHÉTISE
 *     des événements souris au toucher : l'effet part donc bien au tap. C'est
 *     ce qui a produit le premier défaut constaté sur un vrai appareil — une
 *     icône grossie à 132 px, à cheval sur le contenu et coupée par le bord de
 *     l'écran. Les bornes plus bas viennent de là.
 *
 *  2. PLUS DE PASTILLE GLISSANTE. Celle de `BottomNav` bougeait sur
 *     `onPointerDown`, avant même la navigation : mesuré, rien ne bougeait dans
 *     les 120 ms suivant le tap sans elle. Le Dock ne rend rien au toucher tant
 *     que la page n'a pas changé.
 *
 *  3. PLUS DE `aria-current="page"`. Le Dock pose `aria-label` et rien d'autre.
 *     L'onglet courant est donc dit dans le libellé (« Accueil, page
 *     actuelle ») : un contournement qui garde l'information pour le lecteur
 *     d'écran, sans l'attribut que les technologies d'assistance attendent.
 *
 *  4. DES BOUTONS, PAS DES LIENS. Voir `go()` plus bas.
 *
 * Ce qui est préservé : la navigation côté client, la taille de cible tactile,
 * le repère visuel de l'onglet courant (couleur ET épaisseur de trait), la
 * position dans le flux et la marge basse d'iOS.
 */
/**
 * Taille d'une icône au repos. 44 px : la cible tactile minimale — la case EST
 * la zone touchable, il n'y a pas de marge autour pour rattraper.
 */
const ICON = 44;

/**
 * Le facteur de grossissement maximal.
 *
 * ⚠️ 1,5 N'EST PAS UN CHOIX DE GOÛT, c'est ce qui tient dans l'écran. Mesuré à
 * 390 px, curseur au centre de la barre : 246 px de large à 1, 396 px à 2,
 * 486 px à 3 — soit ~150 px par point de grossissement. Au-delà de ~1,8 la
 * rangée dépasse les 366 px utiles et les icônes des bords sont coupées.
 *
 * 1,5 laisse une marge, parce que la largeur dépend aussi de `distance` et du
 * nombre d'onglets : un sixième onglet, un jour, mangerait ce qui reste.
 *
 * Vérifié après coup sur un contexte tactile à 390 px : icône grossie à 66 px,
 * zéro débordement en haut comme sur les côtés.
 */
const MAGNIFICATION = 1.5;

export function DockNav() {
  const router = useRouter();
  const pathname = usePathname();

  const isActive = (tab: NavTab) =>
    pathname === tab.href || pathname.startsWith(`${tab.href}/`);

  /**
   * ⚠️ `router.push` et non `href`.
   *
   * Passer `href` au Dock lui fait rendre un `<a>` ORDINAIRE — pas un
   * `next/link`. Dans une app installée, chaque changement d'onglet
   * rechargerait la page entière : écran blanc, polices qui reviennent,
   * session revalidée. C'est exactement ce qu'on ne veut pas d'une barre
   * d'onglets.
   *
   * Le prix : le Dock rend alors un `<button>`, annoncé « bouton » et non
   * « lien », et qu'on ne peut plus ouvrir dans un nouvel onglet. Sur une barre
   * d'onglets mobile, c'est le moindre des deux maux.
   */
  const go = (href: string) => () => router.push(href);

  return (
    <nav
      // Mêmes contraintes que `BottomNav`, et pour les mêmes raisons mesurées :
      // ni `fixed` ni `sticky` — les deux suivent le rebond élastique d'iOS —
      // mais un élément normal en dernière ligne d'une coque qui ne défile pas.
      className="z-30 flex w-full flex-none items-end justify-center overflow-hidden border-t border-border bg-background px-3"
      style={{
        /*
          ⚠️ LA BARRE RÉSERVE LA HAUTEUR DE L'ICÔNE GROSSIE. C'est ce qui règle
          le défaut vu sur l'iPhone : l'icône touchée sortait par le haut, en
          travers du contenu de la page.

          Un dock grossit ses icônes VERS LE HAUT — c'est sa mécanique, celle du
          dock de macOS, où il flotte au-dessus du bureau. Posé en bas d'une page
          qu'on lit, ce débordement passe sur le texte. La seule façon de
          l'empêcher sans casser l'effet est de lui donner d'avance la place
          qu'il prendra : `ICON × MAGNIFICATION`, plus une respiration.

          `overflow-hidden` est la ceinture par-dessus la bretelle : si un
          réglage futur dépassait quand même ce calcul, l'icône serait coupée
          net au bord de la barre plutôt que de se répandre sur la page.
        */
        minHeight: `${Math.ceil(ICON * MAGNIFICATION) + 20}px`,
        paddingBottom: "calc(env(safe-area-inset-bottom) + 0.5rem)",
        paddingTop: "0.375rem",
      }}
      aria-label="Navigation principale"
    >
      <Dock
        items={NAV_TABS.map((tab) => {
          const active = isActive(tab);
          const Icon = tab.icon;
          return {
            // L'icône porte elle-même l'état : le Dock n'a pas de notion
            // d'élément courant, donc la couleur et l'épaisseur du trait sont
            // décidées ici. Le trait épaissi n'est pas décoratif — il garde le
            // repère lisible quand la couleur ne se voit pas : plein soleil,
            // daltonisme.
            /*
              ⚠️ `flex h-full w-full` sur l'enveloppe, et ce n'est pas
              décoratif. Le Dock dimensionne l'icône avec `[&_svg]:size-[55%]`,
              donc en POURCENTAGE de son parent. Une première version enveloppait
              le SVG dans un `<span>` sans dimensions : 55 % d'une boîte vide, et
              les icônes restaient minuscules au milieu de cases grossies à
              132 px. Vu à l'écran, pas déduit.
            */
            icon: (
              <span
                className={`flex h-full w-full items-center justify-center ${
                  active ? "text-accent-strong" : "text-muted"
                }`}
              >
                <Icon active={active} />
              </span>
            ),
            // Le contournement du point 3 : l'état entre dans le nom accessible,
            // faute de pouvoir poser `aria-current`.
            label: active ? `${tab.label}, page actuelle` : tab.label,
            onClick: go(tab.href),
          };
        })}
        iconSize={ICON}
        gap={2}
        borderRadius={12}
        /*
          ── LE GROSSISSEMENT, RAMENÉ À CE QUI TIENT DANS LA BARRE ─────────────

          ⚠️ J'AI EU TORT en écrivant que ces valeurs ne se verraient que sur un
          écran avec curseur. Safari sur iPhone SYNTHÉTISE des événements souris
          au toucher : `onMouseMove` part bien au tap, et le grossissement se
          déclenche donc sur le téléphone. Constaté sur un vrai appareil, pas
          dans un émulateur.

          À magnification 3, le résultat mesuré à 390 px est une barre de 486 px
          — 96 px hors écran — dont l'icône touchée sort aussi par le HAUT, en
          travers du contenu de la page. C'était le cas sur la capture.

          Les deux bornes sont donc calculées, pas choisies :

          - HORIZONTALEMENT, la rangée entière doit tenir dans l'écran. La
            largeur croît d'environ 150 px par point de magnification (mesuré :
            246 px à 1, 396 px à 2, 486 px à 3).
          - VERTICALEMENT, l'icône la plus grosse fait `ICON × MAGNIFICATION`, et
            c'est cette hauteur que la barre réserve plus bas. Sans cette
            réservation, un dock grossit par définition PAR-DESSUS ce qui est
            au-dessus de lui — c'est le comportement de celui de macOS, et il
            n'a pas sa place au-dessus d'un contenu qu'on est en train de lire.
        */
        magnification={MAGNIFICATION}
        /*
          Rayon de la vague, resserré de 120 à 70.

          À 120 la vague couvrait la rangée entière : les cinq icônes
          grossissaient ensemble, et c'est cette somme qui poussait les bords
          hors de l'écran. À 70, deux icônes bougent à la fois — l'effet reste
          lisible et la largeur totale cesse d'exploser.
        */
        distance={70}
        springOptions={{ stiffness: 400, damping: 25 }}
        /*
          ⚠️ `alwaysShowLabels` à TRUE, alors que la barre reste sans libellé.

          Ce n'est pas une contradiction : dans le composant, c'est ce drapeau
          qui supprime le bloc d'info-bulle. À `false`, l'info-bulle s'affiche au
          survol — donc au TAP sur iPhone, où elle flottait hors de la barre,
          coupée par le bord de l'écran (« …, page actuelle » sur la capture).

          Les libellés permanents qu'il active à la place sont masqués juste en
          dessous, en CSS. On garde donc les icônes seules, comme demandé, sans
          l'info-bulle qui n'a aucun sens au doigt.
        */
        alwaysShowLabels
        className="border-transparent bg-transparent shadow-none backdrop-blur-none [&>div>span]:hidden"
      />
    </nav>
  );
}
