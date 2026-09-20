"use client";

import { useId } from "react";

// Marque de l'app : une carte NFC vue de biais, qui émet son onde.
//
// Dessinée en SVG plutôt qu'en image — nette à toutes les tailles, et elle
// se recolore avec le thème. Les arêtes sont volontairement franches : la DA
// n'a plus un seul arrondi généreux.
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
        <linearGradient id={degrade} x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stopColor="#9bc400" />
          <stop offset="100%" stopColor="#ccff00" />
        </linearGradient>
      </defs>

      {/* La carte, vue de biais. */}
      <path d="M4 16.5 22 7l14 7.5-18 9.5-14-7.5Z" fill={`url(#${degrade})`} />
      <path d="M4 16.5v12L18 36V24L4 16.5Z" fill="#9bc400" fillOpacity="0.4" />
      <path d="M18 24v12l18-9.5v-12L18 24Z" fill="#ccff00" fillOpacity="0.14" />

      {/* L'onde sans contact : la seule touche de cyan de l'interface. */}
      <path
        d="M39 19a8 8 0 0 1 0 11"
        stroke="#22dfff"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      <path
        d="M43.5 15a14 14 0 0 1 0 19"
        stroke="#22dfff"
        strokeOpacity="0.55"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Marque({ nom }: { nom: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <Logo />
      <span className="titre text-2xl">{nom}</span>
    </div>
  );
}
