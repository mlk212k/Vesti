"use client";

import { usePathname } from "next/navigation";

/**
 * Le « chargement d'écran ».
 *
 * L'animation est portée par une classe CSS, et c'est la CLÉ qui la rejoue :
 * en donnant le chemin courant comme `key`, React remonte le nœud à chaque
 * navigation, donc l'animation repart de zéro. Sans ça, passer d'une page à
 * l'autre ne produirait rien — l'élément existant garde son animation déjà
 * terminée.
 *
 * Le composant ne rend aucun DOM supplémentaire au-delà de ce conteneur, et
 * n'écoute rien : `usePathname` suffit.
 */
export function Ecran({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div key={pathname} className="ecran">
      {children}
    </div>
  );
}
