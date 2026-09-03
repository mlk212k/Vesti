"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export interface ProductMatchView {
  title: string;
  merchant: string;
  url: string;
  price: string | null;
}

export interface SuggestionView {
  id: string;
  item: string;
  why: string | null;
  priority: "haute" | "moyenne" | "basse";
  occasion: string | null;
  product_matches: ProductMatchView[];
  searched_at: string | null;
}

const PRIORITY_LABELS: Record<SuggestionView["priority"], string> = {
  haute: "à faire en premier",
  moyenne: "utile",
  basse: "plus tard",
};

export function SuggestionCard({ suggestion }: { suggestion: SuggestionView }) {
  const [matches, setMatches] = useState(suggestion.product_matches ?? []);
  const [searched, setSearched] = useState(Boolean(suggestion.searched_at));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hidden, setHidden] = useState(false);

  if (hidden) return null;

  async function search() {
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/shopping/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ suggestionId: suggestion.id }),
      });
      const payload = await response.json();
      if (!response.ok) {
        setError(payload.message?.body ?? "Recherche indisponible pour le moment.");
        return;
      }
      setMatches(payload.matches ?? []);
      setSearched(true);
    } catch {
      setError("Recherche indisponible pour le moment.");
    } finally {
      setPending(false);
    }
  }

  async function dismiss() {
    setHidden(true);
    // La colonne `dismissed_at` est la seule que le client peut écrire ici.
    const supabase = createClient();
    await supabase
      .from("shopping_suggestions")
      .update({ dismissed_at: new Date().toISOString() })
      .eq("id", suggestion.id);
  }

  return (
    <li className="flex flex-col gap-3 rounded-[var(--radius-control)] border border-border-soft bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <span className="text-sm font-semibold">{suggestion.item}</span>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-semibold text-accent-strong">
              {PRIORITY_LABELS[suggestion.priority]}
            </span>
            {suggestion.occasion && (
              <span className="rounded-full border border-border px-2 py-0.5 text-[11px] text-muted">
                {suggestion.occasion}
              </span>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label={`Masquer ${suggestion.item}`}
          className="flex-none text-lg leading-none text-muted"
        >
          ×
        </button>
      </div>

      {suggestion.why && (
        <p className="text-sm leading-relaxed text-muted">{suggestion.why}</p>
      )}

      {matches.length > 0 ? (
        <ul className="flex flex-col gap-2 border-t border-border pt-3">
          {matches.map((match) => (
            <li key={match.url}>
              <a
                href={match.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-baseline justify-between gap-3"
              >
                <span className="min-w-0 truncate text-sm font-medium underline underline-offset-2">
                  {match.title}
                </span>
                {match.price && (
                  <span className="flex-none text-xs tabular-nums text-muted">
                    {match.price}
                  </span>
                )}
              </a>
              <span className="text-xs text-muted">{match.merchant}</span>
            </li>
          ))}
        </ul>
      ) : searched ? (
        <p className="border-t border-border pt-3 text-xs text-muted">
          Rien de convaincant trouvé pour cette pièce. Mieux vaut ne rien
          proposer qu&apos;un lien au hasard.
        </p>
      ) : (
        <Button variant="secondary" onClick={search} disabled={pending}>
          {pending ? "Recherche…" : "Trouver des options"}
        </Button>
      )}

      {error && <p className="text-xs text-danger">{error}</p>}
    </li>
  );
}
