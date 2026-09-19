"use client";

import { useEffect } from "react";

// Filet de sécurité d'une page qui a levé une erreur inattendue. Le message
// technique n'est pas affiché tel quel : il peut contenir des détails de la
// base. Il part dans la console pour le débogage.
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="montee panneau mt-10 p-6 text-center">
      <h1 className="titre text-2xl">Quelque chose a lâché</h1>
      <p className="mt-2 text-sm text-dim">
        L&apos;écran n&apos;a pas pu se charger. Rien n&apos;a été enregistré de
        travers — réessaie.
      </p>
      {error.digest ? (
        <p className="mt-2 text-[11px] text-faint">Référence : {error.digest}</p>
      ) : null}
      <button type="button" onClick={reset} className="btn btn-primaire mt-5 px-6">
        Réessayer
      </button>
    </div>
  );
}
