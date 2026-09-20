"use client";

/**
 * Le piège du « déploiement périmé ».
 *
 * Quand l'app est redéployée alors qu'un onglet est resté ouvert, la page
 * chargée continue d'appeler des server actions dont l'identifiant n'existe
 * plus sur le serveur. Next répond alors par une erreur interne, et ce qui
 * s'affiche est un écran technique en anglais qui parle de déploiements —
 * incompréhensible pour quelqu'un qui voulait juste envoyer un message.
 *
 * C'est exactement ce qui est arrivé sur le chat pendant une mise en ligne.
 *
 * Ici on reconnaît ce cas précis et on recharge la page une fois. Une seule
 * fois : `sessionStorage` retient qu'on vient de le faire, pour qu'une vraie
 * panne ne devienne pas une boucle de rechargements.
 */

const CLE = "arena:rechargement";

function estUnDeploiementPerime(erreur: unknown): boolean {
  const texte =
    erreur instanceof Error ? erreur.message : typeof erreur === "string" ? erreur : "";
  return (
    /Failed to find Server Action/i.test(texte) ||
    /older or newer deployment/i.test(texte) ||
    /Connection closed/i.test(texte)
  );
}

/**
 * Enveloppe l'appel d'une server action.
 *
 * - déploiement périmé  → on recharge, la personne ne voit qu'un clignement ;
 * - tout le reste       → un message en français, et l'app continue de vivre.
 */
export async function appelerAction<T>(
  appel: () => Promise<T>,
  secours: (message: string) => T,
): Promise<T> {
  try {
    const resultat = await appel();
    try {
      window.sessionStorage.removeItem(CLE);
    } catch {
      // Stockage indisponible : sans importance, on n'y range qu'un garde-fou.
    }
    return resultat;
  } catch (erreur) {
    if (estUnDeploiementPerime(erreur)) {
      let dejaFait = false;
      try {
        dejaFait = window.sessionStorage.getItem(CLE) === "1";
        window.sessionStorage.setItem(CLE, "1");
      } catch {
        // Pas de stockage : on tente le rechargement, au pire il n'a pas lieu.
      }
      if (!dejaFait) {
        window.location.reload();
        return secours("L'app vient d'être mise à jour, on recharge…");
      }
      return secours(
        "L'app a été mise à jour. Ferme et rouvre l'application pour continuer.",
      );
    }
    return secours("Ça n'est pas passé. Réessaie dans un instant.");
  }
}
