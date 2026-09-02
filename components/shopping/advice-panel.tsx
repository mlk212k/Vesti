"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ProductCard } from "./product-card";
import type { ProductMatch } from "@/lib/claude/schemas";

interface AdvicedPiece {
  item: string;
  why: string;
  matches: ProductMatch[];
}

/**
 * Suggestions d'achat déduites des tenues déjà analysées.
 *
 * Le « pourquoi » est affiché aussi haut que la pièce elle-même, et c'est le
 * cœur du panneau : sans lui, ce sont trois vêtements de plus à acheter, comme
 * partout ailleurs. Avec lui, c'est une réponse à un défaut que la personne a
 * vu passer dans ses propres verdicts.
 *
 * Rien ne part au chargement : la suggestion enchaîne un diagnostic et jusqu'à
 * trois recherches web, toutes facturées.
 */
export function AdvicePanel() {
  const [pieces, setPieces] = useState<AdvicedPiece[] | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setPending(true);
    setError(null);
    setPieces(null);

    try {
      const response = await fetch("/api/shopping/advise", { method: "POST" });
      const payload = await response.json();

      if (!response.ok) {
        setError(payload?.message?.body ?? "La suggestion n'a pas abouti. Réessaie.");
        return;
      }
      setPieces(payload.pieces ?? []);
    } catch {
      setError("La suggestion n'a pas abouti. Réessaie.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="flex flex-col gap-4 rounded-[var(--radius-card)] border border-border-soft bg-surface p-5 shadow-[var(--shadow-card)]">
      <div className="flex flex-col gap-1">
        <h2 className="text-sm font-semibold">Ce qui te manque vraiment</h2>
        <p className="text-xs leading-relaxed text-muted">
          Vesti relit tes tenues analysées, repère ce qui revient dans les
          reproches, et cherche les pièces qui y répondent.
        </p>
      </div>

      {pieces === null && (
        <Button onClick={run} disabled={pending}>
          {pending ? "Vesti relit tes tenues…" : "Voir ce qu'il me manque"}
        </Button>
      )}

      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}

      {pieces !== null && pieces.length === 0 && (
        // Liste vide assumée : inventer un manque pour remplir l'écran serait
        // un mauvais conseil doublé d'une dépense inutile.
        <p className="text-sm leading-relaxed text-muted">
          Rien à te conseiller pour l&apos;instant. Analyse quelques tenues de
          plus : c&apos;est en voyant un reproche revenir que Vesti sait quoi te
          proposer.
        </p>
      )}

      {pieces?.map((piece) => (
        <div key={piece.item} className="flex flex-col gap-2">
          <div className="flex flex-col gap-1">
            <span className="text-sm font-semibold">{piece.item}</span>
            <p className="text-xs leading-relaxed text-muted">{piece.why}</p>
          </div>

          {piece.matches.length > 0 ? (
            <ul className="flex flex-col gap-2">
              {piece.matches.map((match) => (
                <ProductCard key={match.url} match={match} />
              ))}
            </ul>
          ) : (
            <p className="text-xs text-muted">
              Aucune option convaincante trouvée en ligne pour cette pièce.
            </p>
          )}
        </div>
      ))}

      {pieces !== null && (
        <Button variant="ghost" onClick={run} disabled={pending}>
          {pending ? "Vesti relit tes tenues…" : "Relancer"}
        </Button>
      )}
    </section>
  );
}
