"use client";

import { useEffect } from "react";

/**
 * L'écran d'erreur de l'app.
 *
 * Sans ce fichier, une erreur serveur affiche la page technique de Next, en
 * anglais, qui parle de déploiements et de digests. Personne dans l'équipe
 * ne peut rien en faire.
 */
export default function Erreur({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // Une page chargée avant une mise en ligne appelle des actions qui
  // n'existent plus côté serveur. Dans ce cas précis, recharger suffit — et
  // c'est plus honnête de le faire que de demander à la personne de
  // comprendre pourquoi.
  useEffect(() => {
    if (/Failed to find Server Action|older or newer deployment/i.test(error.message)) {
      window.location.reload();
    }
  }, [error]);

  return (
    <main className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center">
      <p className="titre text-[clamp(2.2rem,11vw,3.4rem)]">Ça a coincé</p>
      <p className="mt-4 max-w-sm text-dim">
        Rien n&apos;est perdu. Réessaie, et si ça recommence, ferme et rouvre
        l&apos;application.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <button type="button" onClick={reset} className="btn btn-primaire">
          Réessayer
        </button>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="btn btn-fantome"
        >
          Recharger la page
        </button>
      </div>
    </main>
  );
}
