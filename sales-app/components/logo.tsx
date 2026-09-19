// Marque de l'app. Un monogramme dessiné en SVG — pas d'image à charger, et
// il reste net sur tous les écrans.
//
// Le glyphe : un losange taillé (l'entaille des panneaux, reprise en petit)
// traversé d'une barre en diagonale. Original, et cohérent avec le reste de
// l'interface plutôt qu'emprunté à quoi que ce soit.
export function Logo({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      className={className}
      role="img"
      aria-label="Logo"
      fill="none"
    >
      <defs>
        <linearGradient id="logo-degrade" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#8b5cf6" />
          <stop offset="100%" stopColor="#ff2d86" />
        </linearGradient>
      </defs>
      <path
        d="M24 3 43 14v20L24 45 5 34V14L24 3Z"
        stroke="url(#logo-degrade)"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      <path
        d="M16 31 32 17"
        stroke="url(#logo-degrade)"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path
        d="M24 24h8v8"
        stroke="#f4f2ef"
        strokeOpacity="0.85"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
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
