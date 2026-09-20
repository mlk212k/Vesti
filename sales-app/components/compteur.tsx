"use client";

import { useEffect, useRef } from "react";
import { formatCents, formatCentsShort } from "@/lib/money";

/**
 * Un nombre qui monte jusqu'à sa valeur.
 *
 * Trois précautions qui comptent :
 *
 *   - le texte final est rendu CÔTÉ SERVEUR dans le DOM, et l'animation ne
 *     fait que le réécrire. Si le JavaScript ne part pas, la bonne valeur
 *     est déjà là — un chiffre d'affaires ne doit jamais dépendre d'une
 *     animation ;
 *   - on écrit dans `textContent` via une ref plutôt que dans un `state` :
 *     soixante rendus React par seconde pour un nombre qui défile, c'est du
 *     gaspillage pur ;
 *   - la mise en forme est désignée par une CHAÎNE, pas par une fonction.
 *     Ce composant est appelé depuis des composants serveur, et une fonction
 *     ne traverse pas cette frontière.
 */

export type FormatCompteur = "nombre" | "montant" | "montant-exact" | "pourcent";

function rendre(valeur: number, format: FormatCompteur): string {
  switch (format) {
    case "montant":
      return formatCentsShort(Math.round(valeur));
    case "montant-exact":
      return formatCents(Math.round(valeur));
    case "pourcent":
      return `${Math.round(valeur)} %`;
    default:
      return String(Math.round(valeur));
  }
}

export function Compteur({
  valeur,
  format = "nombre",
  duree = 1100,
}: {
  valeur: number;
  format?: FormatCompteur;
  duree?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const reduit = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduit || valeur === 0) {
      el.textContent = rendre(valeur, format);
      return;
    }

    let image = 0;
    const debut = performance.now();

    const avance = (maintenant: number) => {
      const t = Math.min(1, (maintenant - debut) / duree);
      // Sortie très amortie : le nombre file au début puis se pose, comme un
      // compteur mécanique qui ralentit.
      const eased = 1 - Math.pow(1 - t, 4);
      el.textContent = rendre(valeur * eased, format);
      if (t < 1) image = requestAnimationFrame(avance);
    };

    image = requestAnimationFrame(avance);
    return () => cancelAnimationFrame(image);
  }, [valeur, format, duree]);

  return <span ref={ref}>{rendre(valeur, format)}</span>;
}
