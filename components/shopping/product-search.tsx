"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import type { ProductMatch } from "@/lib/claude/schemas";

/** Exemples cliquables : un champ vide n'apprend à personne ce qu'il accepte. */
const EXAMPLES = [
  "un jean noir coupe droite",
  "des baskets blanches sobres",
  "une veste mi-saison",
];

/**
 * Recherche libre de vêtements.
 *
 * La personne décrit ce qu'elle veut, le serveur y ajoute son profil — rayon,
 * taille, morphologie, styles — avant d'aller chercher. Sans ça, « un jean
 * droit » renverrait la même chose à tout le monde, ce qui est exactement le
 * service que rend déjà n'importe quel moteur de recherche.
 *
 * La recherche part à la demande, jamais au chargement : elle est facturée à
 * l'usage, et l'ouvrir automatiquement ferait payer une page qu'on ne regarde
 * pas.
 */
export function ProductSearch() {
  const [query, setQuery] = useState("");
  const [matches, setMatches] = useState<ProductMatch[] | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(value: string) {
    const trimmed = value.trim();
    if (trimmed.length < 3) {
      setError("Décris un peu plus ce que tu cherches.");
      return;
    }

    setPending(true);
    setError(null);
    setMatches(null);

    try {
      const response = await fetch("/api/shopping/find", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: trimmed }),
      });
      const payload = await response.json();

      if (!response.ok) {
        setError(payload?.message?.body ?? "La recherche n'a pas abouti. Réessaie.");
        return;
      }
      setMatches(payload.matches ?? []);
    } catch {
      setError("La recherche n'a pas abouti. Réessaie.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="flex flex-col gap-4">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          run(query);
        }}
        className="flex flex-col gap-2"
      >
        <Input
          aria-label="Ce que tu cherches"
          placeholder="Qu'est-ce que tu cherches ?"
          value={query}
          maxLength={160}
          onChange={(event) => {
            setQuery(event.target.value);
            setError(null);
          }}
        />
        <Button type="submit" disabled={pending || query.trim().length < 3}>
          {pending ? "Recherche en cours…" : "Chercher"}
        </Button>
      </form>

      {!pending && matches === null && (
        <div className="flex flex-wrap gap-2">
          {EXAMPLES.map((example) => (
            <button
              key={example}
              type="button"
              onClick={() => {
                setQuery(example);
                run(example);
              }}
              style={{ touchAction: "manipulation" }}
              className="rounded-full border border-border-soft bg-surface px-3 py-1.5 text-xs font-medium text-muted transition hover:border-accent hover:text-accent-strong"
            >
              {example}
            </button>
          ))}
        </div>
      )}

      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}

      {pending && (
        <p className="text-sm text-muted">
          Vesti cherche de vraies pièces en ligne, ça prend quelques secondes.
        </p>
      )}

      {matches !== null && matches.length === 0 && !pending && (
        // Une liste vide est un vrai résultat : le modèle n'a pas le droit
        // d'inventer un lien pour remplir l'écran.
        <p className="text-sm leading-relaxed text-muted">
          Rien de convaincant trouvé pour cette demande. Essaie d&apos;être plus
          précis — la couleur, la coupe, la matière.
        </p>
      )}

      {matches !== null && matches.length > 0 && (
        <ul className="flex flex-col gap-3">
          {matches.map((match) => (
            <ProductCard key={match.url} match={match} />
          ))}
        </ul>
      )}
    </section>
  );
}

function ProductCard({ match }: { match: ProductMatch }) {
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
