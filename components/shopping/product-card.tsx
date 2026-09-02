"use client";

import type { ProductMatch } from "@/lib/claude/schemas";

/**
 * Un produit trouvé en ligne. Partagée par la recherche libre et par les
 * suggestions tirées des analyses : deux dessins différents pour la même chose
 * feraient douter que ce soit la même chose.
 */
export function ProductCard({ match }: { match: ProductMatch }) {
  return (
    <li>
      <a
        href={match.url}
        target="_blank"
        rel="noopener noreferrer"
        style={{ touchAction: "manipulation" }}
        className="flex gap-3 rounded-2xl border border-border-soft bg-surface p-3 transition hover:border-accent active:scale-[0.99]"
      >
        {/* Beaucoup de fiches produit ne publient pas de photo : la carte doit
            tenir sans, plutôt que de réserver un carré vide. */}
        {match.image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={match.image}
            alt=""
            loading="lazy"
            className="h-20 w-20 flex-none rounded-xl border border-border-soft object-cover"
          />
        )}
        <div className="flex min-w-0 flex-col gap-1">
          <span className="line-clamp-2 text-sm font-semibold">{match.title}</span>
          <span className="text-xs text-muted">{match.merchant}</span>
          {match.price && (
            <span className="text-sm font-bold tabular-nums">{match.price}</span>
          )}
        </div>
      </a>
    </li>
  );
}
