"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_TABS } from "./tabs";

/**
 * Barre de navigation basse : le repère standard sur mobile, à portée de pouce.
 * Les onglets et leurs icônes vivent dans `./tabs`, partagés avec `DockNav`.
 */
const TABS = NAV_TABS;

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
        <SlidingPill
          index={tappedIndex >= 0 ? tappedIndex : activeIndex}
          count={TABS.length}
        />
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
              className={`relative flex flex-1 items-center justify-center transition-colors ${
                active ? "text-accent-strong" : "text-muted"
              }`}
              /* ⚠️ Le nom quitte l'ÉCRAN, pas l'accessibilité. Une barre
                 d'icônes nues sans nom accessible est muette au lecteur
                 d'écran : `aria-label` porte le libellé que l'œil ne voit
                 plus. (`aria-current` est déjà posé plus haut.) */
              aria-label={tab.label}
            >
              {/* La boîte de la pastille reste ici : c'est elle qui donne sa
                  place à l'icône. La couleur est peinte par l'unique pastille
                  glissante posée derrière. */}
              <span className="flex h-7 w-12 items-center justify-center">
                <Icon active={active} />
              </span>
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
 * Horizontalement : les onglets sont en `flex-1` avec une base nulle, donc tous
 * de largeur identique. La pastille vit dans une case de cette même largeur —
 * calculée depuis le nombre d'onglets, pas écrite en dur — et se décale de
 * `index × 100 %` de SA propre largeur, soit exactement une case.
 *
 * Verticalement : la case rejoue les mêmes classes de mise en page que les
 * onglets (`justify-center gap-1 pt-1.5`) et contient les deux mêmes boîtes —
 * la pastille et une ligne de texte. Même recette, même résultat : la pastille
 * se cale d'elle-même sur les icônes, et elle y reste si la hauteur de la barre
 * ou la taille du libellé changent un jour. Une valeur `top` codée en dur, elle,
 * se serait décalée en silence à la première de ces retouches.
 */
function SlidingPill({ index, count }: { index: number; count: number }) {
  // Aucun onglet ne correspond (réglages, facturation…) : pas de pastille du
  // tout. La laisser sous « Accueil » désignerait une page où l'on n'est pas.
  if (index < 0) return null;

  return (
    <div className="pointer-events-none absolute inset-0 flex" aria-hidden>
      <div
        className="flex items-center justify-center transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
        // La largeur vient du NOMBRE d'onglets, pas d'une classe `w-1/5` figée :
        // le jour où l'on en ajoute ou en retire un — c'est arrivé — la pastille
        // se serait décalée en silence sur tous les onglets sauf le premier.
        style={{
          width: `${100 / count}%`,
          transform: `translateX(${index * 100}%)`,
        }}
      >
        <span className="h-7 w-12 rounded-full bg-accent-soft" />
      </div>
    </div>
  );
}
