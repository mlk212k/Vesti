import Link from "next/link";

/**
 * Le retour en haut d'une sous-page.
 *
 * ⚠️ C'est un lien vers une adresse PRÉCISE, pas un `router.back()`.
 *
 * `back()` rejoue l'historique du navigateur, qui n'est pas l'arborescence de
 * l'app : on peut arriver sur « Mon profil » depuis un lien, un rechargement, ou
 * l'écran d'accueil du téléphone. Dans ces cas-là, le bouton retour renvoie hors
 * de Vesti — l'utilisateur croit remonter d'un cran et se retrouve dehors, dans
 * une app installée qui n'a même pas de barre d'adresse pour revenir.
 *
 * Un lien vers le parent remonte toujours d'un cran, quel qu'ait été le chemin
 * emprunté pour arriver là.
 */
export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      // Cible tactile pleine hauteur, décalée à gauche de la marge de page pour
      // que la flèche s'aligne optiquement sur le titre en dessous.
      className="-ml-2 inline-flex min-h-[44px] w-fit items-center gap-1.5 rounded-[var(--radius-control)] pr-3 pl-2 text-sm font-semibold text-muted transition-colors active:bg-surface-sunken"
      style={{ touchAction: "manipulation" }}
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M14.5 5.5 8 12l6.5 6.5" />
      </svg>
      {label}
    </Link>
  );
}
