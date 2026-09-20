// Le motif NFC : les trois arcs du sans-contact.
//
// C'est le signe du produit vendu, pas une décoration empruntée. Il revient à
// trois échelles — dans le logo, en filigrane derrière les panneaux
// principaux, et en petite icône sur les compteurs de cartes — ce qui suffit
// à faire une identité sans jamais avoir à écrire « NFC » en toutes lettres.

export function OndeNFC({
  className = "",
  taille = 120,
}: {
  className?: string;
  taille?: number;
}) {
  return (
    <svg
      viewBox="0 0 64 64"
      width={taille}
      height={taille}
      fill="none"
      className={`pointer-events-none absolute text-craie ${className}`}
      aria-hidden="true"
    >
      {/* Le point d'émission, puis trois arcs de plus en plus larges. */}
      <circle cx="14" cy="32" r="3.2" fill="currentColor" />
      <path
        d="M23 21a18 18 0 0 1 0 22"
        stroke="currentColor"
        strokeWidth="3.4"
        strokeLinecap="round"
      />
      <path
        d="M33 14a30 30 0 0 1 0 36"
        stroke="currentColor"
        strokeWidth="3.4"
        strokeLinecap="round"
      />
      <path
        d="M43 7a42 42 0 0 1 0 50"
        stroke="currentColor"
        strokeWidth="3.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

// Filigrane d'angle. Volontairement rogné par le panneau : une onde qui
// déborde du cadre se lit comme un signal qui traverse, pas comme un logo
// collé dans un coin.
export function FiligraneNFC() {
  return <OndeNFC taille={170} className="-top-6 -right-8 opacity-[0.045]" />;
}

// Petite icône NFC, pour les compteurs de cartes.
export function IconNFC({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" className={className} aria-hidden="true">
      <circle cx="14" cy="32" r="4" fill="currentColor" />
      <path d="M24 21a18 18 0 0 1 0 22" stroke="currentColor" strokeWidth="4.5" strokeLinecap="round" />
      <path d="M35 13a31 31 0 0 1 0 38" stroke="currentColor" strokeWidth="4.5" strokeLinecap="round" />
      <path d="M46 5a44 44 0 0 1 0 54" stroke="currentColor" strokeWidth="4.5" strokeLinecap="round" />
    </svg>
  );
}
