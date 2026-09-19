"use client";

import { useId } from "react";

// Marque de l'app. Un monogramme dessiné en SVG — pas d'image à charger, et
// il reste net sur tous les écrans.
//
// Le glyphe : un hexagone taillé (l'entaille des panneaux, reprise en petit)
// traversé d'une barre en diagonale, avec l'onde NFC qui en sort. La carte et
// le signal qu'elle émet, en un seul signe. Rien n'est emprunté à une marque
// ou à un jeu existant.
export function Logo({ className = "h-9 w-9" }: { className?: string }) {
  // Identifiant unique par instance : sans lui, deux logos sur la même page
  // partagent un id de dégradé, et le navigateur résout la référence vers le
  // premier — y compris s'il est dans un bloc masqué, auquel cas plus rien
  // ne se peint.
  const degrade = useId();

  return (
    <svg
      viewBox="0 0 48 48"
      className={className}
      role="img"
      aria-label="Logo"
      fill="none"
    >
      <defs>
        <linearGradient id={degrade} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#8b5cf6" />
          <stop offset="100%" stopColor="#ff2d86" />
        </linearGradient>
      </defs>

      <path
        d="M24 3 43 14v20L24 45 5 34V14L24 3Z"
        stroke={`url(#${degrade})`}
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      <path
        d="M15 32 29 18"
        stroke={`url(#${degrade})`}
        strokeWidth="4"
        strokeLinecap="round"
      />

      {/* L'onde qui part de la carte. */}
      <path
        d="M30 19.5a9 9 0 0 1 0 11"
        stroke="#29e0ff"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="M34.5 16a15 15 0 0 1 0 18"
        stroke="#29e0ff"
        strokeOpacity="0.6"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Marque({ nom }: { nom: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <Logo />
      <span className="titre text-xl">{nom}</span>
    </div>
  );
}
