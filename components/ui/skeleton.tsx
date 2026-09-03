/**
 * Les formes qu'on montre pendant qu'une page charge.
 *
 * ⚠️ Ce qui rend une app rapide, ce n'est pas d'animer l'attente : c'est de
 * montrer TOUT DE SUITE la structure de ce qui arrive. Sans ces écrans, changer
 * d'onglet laissait l'ancienne page figée pendant que la suivante se
 * préparait — rien ne bougeait, rien ne disait que ça travaillait, et l'app
 * paraissait lourde alors qu'elle ne l'était pas.
 *
 * 🔑 La règle qui décide si ça marche : le squelette doit avoir les MÊMES
 * dimensions que le contenu réel. Un squelette aux mauvaises mesures produit un
 * saut au moment du remplacement, et ce saut est plus désagréable que l'attente
 * qu'il prétendait masquer. Les hauteurs ci-dessous sont donc reprises des
 * pages, pas choisies au jugé.
 */

/** Bloc gris qui pulse doucement. La brique de tout le reste. */
export function Bone({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-[var(--radius-control)] bg-surface-sunken ${className}`}
      aria-hidden
    />
  );
}

/** Carte blanche vide, au rayon et à l'ombre des vraies cartes. */
export function BoneCard({
  className = "",
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={`flex flex-col gap-3 rounded-[var(--radius-card)] border border-border-soft bg-surface p-5 ${className}`}
      aria-hidden
    >
      {children}
    </div>
  );
}

/**
 * L'enveloppe commune : mêmes marges que les `main` des pages (px-5 py-8).
 *
 * `aria-busy` plutôt qu'un texte visible : un lecteur d'écran annonce le
 * chargement, et l'écran reste calme.
 */
export function SkeletonPage({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <main className="flex flex-1 flex-col gap-6 px-5 py-8" aria-busy="true">
      <span className="sr-only">{title} — chargement</span>
      {/* Le titre garde sa taille réelle (2rem / 1.9rem selon la page) pour
          que rien ne se décale quand le vrai titre le remplace. */}
      <Bone className="h-9 w-2/3" />
      {children}
    </main>
  );
}
