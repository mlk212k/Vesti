/**
 * Le fond animé de l'application.
 *
 * Sept couches, toutes purement décoratives et toutes en `pointer-events:
 * none` — rien ici ne capte un geste :
 *
 *   1. QUATRE halos de couleur qui dérivent, à des vitesses différentes ;
 *   2. un treillis de chrome qui défile (le filaire d'un objet en rendu) ;
 *   3. trois ondes NFC concentriques (le geste du produit) ;
 *   4. un champ d'étincelles qui scintillent ;
 *   5. quatre équerres de visée, aux coins de l'écran (le cadre d'arcade) ;
 *   6. la courbure cathodique, qui assombrit les coins ;
 *   7. un vernis iridescent et les lignes de balayage.
 *
 * Les halos sont de VRAIS éléments et non des pseudo-éléments de `.lampe` :
 * un élément n'en offre que deux, et il en faut quatre pour que les
 * couleurs se croisent au lieu de se faire face. Leurs durées sont
 * volontairement premières entre elles (37, 43, 53, 61 s) — sinon les
 * quatre repassent périodiquement par la même configuration, et on voit la
 * boucle. Même raison pour les étincelles.
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

        {/* Le champ d'étincelles. Positions et retards écrits à la main :
            un aléatoire côté serveur donnerait une disposition différente à
            chaque rendu, donc un saut visible à l'hydratation. */}
        <div className="etoiles">
          <span className="etoile" style={{ top: "12%", left: "18%", animationDelay: "0s" }} />
          <span className="etoile" style={{ top: "28%", left: "82%", animationDelay: "1.7s" }} />
          <span className="etoile" style={{ top: "47%", left: "9%", animationDelay: "3.1s" }} />
          <span className="etoile" style={{ top: "63%", left: "73%", animationDelay: "4.6s" }} />
          <span className="etoile" style={{ top: "78%", left: "31%", animationDelay: "2.3s" }} />
          <span className="etoile" style={{ top: "89%", left: "88%", animationDelay: "5.4s" }} />
        </div>
      </div>

      {/* Les équerres de visée. Fixes, aux quatre coins : c'est le cadre
          d'un viseur de jeu, et ça donne à l'écran un bord DÉLIBÉRÉ au lieu
          d'un contenu qui s'arrête là où le téléphone s'arrête. */}
      <div className="hud" aria-hidden="true">
        <span className="equerre" />
        <span className="equerre" />
        <span className="equerre" />
        <span className="equerre" />
      </div>

      <div className="vernis" aria-hidden="true" />
    </>
  );
}
