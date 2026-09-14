/**
 * La flèche des listes « à ajuster ».
 *
 * ⚠️ C'était le caractère `→` écrit en dur. Même défaut que les coches, et même
 * correction : un glyphe texte dépend de la police du système, ne suit aucun
 * jeton de couleur ou de graisse, et s'aligne différemment d'une plateforme à
 * l'autre. Sur l'écran du verdict — le seul que la personne lit vraiment — la
 * flèche se retrouvait plus épaisse que la coche juste au-dessus, alors que
 * les deux marquent le même niveau de liste.
 *
 * Tracée avec la même grille, la même graisse de trait et les mêmes
 * terminaisons carrées que `CheckIcon` : posées l'une sous l'autre, elles
 * doivent appartenir à la même famille.
 */
export function ArrowIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden
      className={`mt-[3px] h-3.5 w-3.5 flex-none ${className}`}
    >
      <path
        d="M3 8h9M8.5 4.5 12.5 8l-4 3.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="square"
        strokeLinejoin="miter"
      />
    </svg>
  );
}
