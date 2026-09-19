"use client";

import { useEffect } from "react";

// Enregistrement du service worker.
//
// Uniquement en production : en développement, les fichiers de /_next/static
// changent à chaque rechargement à chaud, et un cache « d'abord le cache »
// servirait des morceaux périmés. Pour l'essayer en local :
// `npm run build && npm start`.
export function EnregistreServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    const enregistrer = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Navigateur en navigation privée, ou permission refusée : l'app
        // fonctionne exactement pareil, elle démarre juste moins vite.
      });
    };

    if (document.readyState === "complete") enregistrer();
    else window.addEventListener("load", enregistrer, { once: true });
  }, []);

  return null;
}
