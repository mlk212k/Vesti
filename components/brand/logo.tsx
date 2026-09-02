import Image from "next/image";

/**
 * La marque, en deux morceaux : le disque seul (`LogoMark`) et le disque plus le
 * mot (`Wordmark`).
 *
 * Le fichier source est un PNG carré à 512 px, détouré : le disque violet touche
 * les quatre bords, donc la taille demandée est bien la taille rendue, sans
 * marge fantôme à compenser dans les alignements.
 */
export function LogoMark({
  size = 32,
  className = "",
  priority = false,
}: {
  size?: number;
  className?: string;
  priority?: boolean;
}) {
  return (
    <Image
      src="/logo.png"
      // Décoratif : le nom « Vesti » est toujours écrit à côté, en texte.
      alt=""
      width={size}
      height={size}
      priority={priority}
      className={className}
      style={{ width: size, height: size }}
    />
  );
}

export function Wordmark({
  size = 28,
  className = "",
  priority = false,
}: {
  size?: number;
  className?: string;
  priority?: boolean;
}) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <LogoMark size={size} priority={priority} />
      <span
        className="font-display font-extrabold leading-none tracking-[-0.045em]"
        style={{ fontSize: size * 0.82 }}
      >
        Vesti
      </span>
    </span>
  );
}
