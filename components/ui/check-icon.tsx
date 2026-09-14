/**
 * La coche des listes de points forts.
 *
 * ⚠️ C'était le caractère `✓` écrit en dur, à trois endroits. Un glyphe texte
 * dépend de la police du système : il ne se dessine pas pareil sur iPhone et
 * sur Android, sa graisse ne suit aucun jeton, et son alignement sur la ligne
 * de base varie d'une plateforme à l'autre. Sur l'écran du verdict — le seul
 * moment où la personne regarde vraiment — c'était le détail qui trahissait
 * l'interface bricolée à côté d'icônes SVG propres partout ailleurs.
 *
 * `stroke="currentColor"` : la couleur vient du parent, donc du jeton. Elle
 * suit le thème sans qu'on ait à la redéclarer ici.
 *
 * `aria-hidden` : le texte à côté dit déjà « point fort ». Annoncer « coche »
 * avant chaque ligne ferait répéter le lecteur d'écran sans rien ajouter.
 */
export function CheckIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden
      // 1 pt sous la ligne de base : une coche centrée optiquement sur une
      // capitale flotte au-dessus du texte en bas de casse.
      className={`mt-[3px] h-3.5 w-3.5 flex-none ${className}`}
    >
      <path
        d="M3 8.5 6.2 11.5 13 4.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="square"
        strokeLinejoin="miter"
      />
    </svg>
  );
}
