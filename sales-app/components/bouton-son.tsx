"use client";

import { useSyncExternalStore } from "react";
import { abonnerSons, basculerSons, lireSons, lireSonsServeur } from "@/lib/sfx";

// Interrupteur des sons.
//
// L'état réel vit dans localStorage, donc hors de React. `useSyncExternalStore`
// est fait exactement pour ça : il lit la source au bon moment, gère le rendu
// serveur (où localStorage n'existe pas) et évite le `setState` dans un effet
// qui provoquerait un rendu en cascade.
export function BoutonSon() {
  const actifs = useSyncExternalStore(abonnerSons, lireSons, lireSonsServeur);

  return (
    <button
      type="button"
      onClick={() => basculerSons()}
      className="panneau flex w-full items-center justify-between p-4 text-left"
      aria-pressed={actifs}
    >
      <span>
        <span className="titre text-lg">Sons</span>
        <span className="mt-1 block text-sm text-faint">
          Le tiroir-caisse à chaque vente, le tampon en fin de journée.
        </span>
      </span>
      <span
        className={` text-sm    ${
          actifs ? "text-peche" : "text-faint"
        }`}
      >
        {actifs ? "ON" : "OFF"}
      </span>
    </button>
  );
}
