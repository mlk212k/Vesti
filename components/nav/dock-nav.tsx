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
 *  1. LA MAGNIFICATION NE SE DÉCLENCHE JAMAIS. Elle suit `onMouseMove`. Un
 *     téléphone n'a pas de curseur, et 92 % du trafic de Vesti vient de TikTok,
 *     donc de mobiles. Sur le téléphone de la personne, ce dock est une rangée
 *     d'icônes fixes — l'effet qui justifie de l'installer ne s'y voit pas.
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
      className="z-30 flex w-full flex-none justify-center border-t border-border bg-background px-3 py-2"
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 0.5rem)" }}
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
        // 44 px : la cible tactile minimale. Le défaut du composant est 40, pensé
        // pour un pointeur précis.
        iconSize={44}
        gap={2}
        borderRadius={12}
        /*
          Le grossissement demandé.

          ⚠️ IL NE SE VERRA QUE SUR UN ÉCRAN AVEC CURSEUR. `magnification` pilote
          une courbe gaussienne calée sur `onMouseMove` : sans souris, aucune de
          ces trois valeurs n'a d'effet. Elles sont posées telles que demandées,
          pour le jour où Vesti aura une vue bureau.

          `distance` est le rayon en pixels dans lequel les voisines grossissent
          aussi. À 120 sur une barre large de ~340 px, la vague couvre presque
          toute la rangée : trois icônes bougent en même temps, ce qui adoucit
          l'effet au lieu de faire sauter une seule icône.
        */
        magnification={3}
        distance={120}
        springOptions={{ stiffness: 400, damping: 25 }}
        // Conforme à la barre actuelle : icônes seules, sans libellé à l'écran.
        // Les libellés du Dock n'apparaissent de toute façon qu'au survol, donc
        // jamais sur un téléphone.
        alwaysShowLabels={false}
        className="border-transparent bg-transparent shadow-none backdrop-blur-none"
      />
    </nav>
  );
}
