/**
 * Le fond animé de l'application.
 *
 * Cinq couches, toutes purement décoratives et toutes en `pointer-events:
 * none` — rien ici ne capte un geste :
 *
 *   1. QUATRE halos de couleur qui dérivent, à des vitesses différentes ;
 *   2. un treillis de chrome qui défile (le filaire d'un objet en rendu) ;
 *   3. trois ondes NFC concentriques (le geste du produit) ;
 *   4. un vernis : une bande iridescente qui traverse l'écran très
 *      lentement, comme sur une vitre qu'on vient de polir.
 *
 * Les halos sont de VRAIS éléments et non des pseudo-éléments de `.lampe` :
 * un élément n'en offre que deux, et il en faut quatre pour que les
 * couleurs se croisent au lieu de se faire face. Leurs durées sont
 * volontairement premières entre elles (37, 43, 53, 61 s) — sinon les
 * quatre repassent périodiquement par la même configuration, et on voit la
 * boucle.
 *
 * C'est un composant SERVEUR : aucun état, aucun écouteur, aucune image.
 * Tout le mouvement vient de `globals.css`, donc rien de tout ça n'ajoute
 * une ligne de JavaScript au client.
 *
 * `prefers-reduced-motion` éteint toutes les couches animées.
 */
export function Fond() {
  return (
    <>
      <div className="lampe" aria-hidden="true">
        <span className="halo halo-acide" />
        <span className="halo halo-lilas" />
        <span className="halo halo-glacier" />
        <span className="halo halo-rose" />

        <div className="ondes">
          <span className="onde" />
          <span className="onde" />
          <span className="onde" />
        </div>
        <div className="grille" />
      </div>
      <div className="vernis" aria-hidden="true" />
    </>
  );
}
