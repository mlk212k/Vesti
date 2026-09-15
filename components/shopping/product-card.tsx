"use client";

import type { ProductMatch } from "@/lib/claude/schemas";
import { affiliateUrl } from "@/lib/affiliate";
import { env } from "@/lib/env";

/**
 * Un produit trouvé en ligne. Partagée par la recherche libre et par les
 * suggestions tirées des analyses : deux dessins différents pour la même chose
 * feraient douter que ce soit la même chose.
 *
 * ── Le seul endroit où une URL produit devient un lien cliquable ────────────
 *
 * C'est donc ici que passe l'affiliation, et nulle part ailleurs. Transformer
 * au moment du stockage aurait figé une décision commerciale dans des lignes
 * qu'on ne peut plus corriger : la base garde l'URL d'origine, et chaque
 * affichage repasse par la règle du moment. Voir `lib/affiliate.ts`.
 *
 * Sans configuration d'affiliation, `affiliateUrl` rend l'URL telle quelle —
 * la carte se comporte exactement comme avant.
 */
export function ProductCard({ match }: { match: ProductMatch }) {
  const href = affiliateUrl(match.url, env.affiliate);

  return (
    <li>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        style={{ touchAction: "manipulation" }}
        className="flex gap-3 rounded-[var(--radius-control)] panel p-3 transition hover:border-accent active:scale-[0.99]"
      >
        {/* Beaucoup de fiches produit ne publient pas de photo : la carte doit
            tenir sans, plutôt que de réserver un carré vide. */}
        {match.image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={match.image}
            alt=""
            loading="lazy"
            className="h-20 w-20 flex-none rounded-[var(--radius-control)] border border-border-soft object-cover"
          />
        )}
        <div className="flex min-w-0 flex-col gap-1">
          <span className="line-clamp-2 text-sm font-semibold">{match.title}</span>
          <span className="text-xs text-muted">{match.merchant}</span>
          {match.price && (
            <span className="text-sm font-semibold tabular-nums">{match.price}</span>
          )}
        </div>
      </a>
    </li>
  );
}
