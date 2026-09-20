/**
 * Le fond animé de l'application.
 *
 * Quatre couches, toutes purement décoratives et toutes en `pointer-events:
 * none` — rien ici ne capte un geste :
 *
 *   1. deux lavis de couleur qui dérivent (la chaleur) ;
 *   2. une grille en perspective qui défile (le sol des jeux 80) ;
 *   3. trois ondes NFC concentriques (le geste du produit) ;
 *   4. des lignes de balayage cathodiques, presque invisibles.
 *
 * C'est un composant SERVEUR : il ne contient aucun état, aucun écouteur,
 * aucune image. Tout le mouvement vient de `globals.css`, donc rien de tout
 * ça n'ajoute une ligne de JavaScript au client.
 *
 * `prefers-reduced-motion` éteint les trois couches animées.
 */
export function Fond() {
  return (
    <>
      <div className="lampe" aria-hidden="true">
        <div className="ondes">
          <span className="onde" />
          <span className="onde" />
          <span className="onde" />
        </div>
        <div className="grille" />
      </div>
      <div className="scanlines" aria-hidden="true" />
    </>
  );
}
