"use client";

import type { CropBox } from "@/lib/claude/schemas";
import { GarmentThumb } from "./garment-thumb";

export interface ProductMatchView {
  title: string;
  merchant: string;
  url: string;
  price: string | null;
}

export interface GarmentView {
  category: string;
  label: string;
  color: string;
  material: string | null;
  brand: string | null;
  brand_confidence: "logo_visible" | "suppose" | "inconnue";
  crop_box: CropBox;
  confidence: number;
  product_matches: ProductMatchView[];
}

export interface AnalysisView {
  score: number;
  verdict: string;
  strengths: string[];
  improvements: string[];
  occasion: string;
  garments: GarmentView[];
  savedToWardrobe: boolean;
}

export function VerdictCard({
  analysis,
  photoUrl,
}: {
  analysis: AnalysisView;
  photoUrl: string;
}) {
  return (
    <div className="flex flex-col gap-6">
      {/* L'écran de récompense : c'est le seul endroit de l'app où le violet
          prend toute la carte. Le score y est le point de mire, le verdict se
          lit juste en dessous sur fond clair. */}
      <section className="overflow-hidden rounded-[var(--radius-card)] border border-border-soft bg-surface">
        <div className="flex flex-col items-center gap-1 bg-accent px-6 py-7 text-accent-foreground">
          <span className="font-display text-[64px] font-extrabold leading-none tracking-[-0.05em] tabular-nums">
            {analysis.score}
          </span>
          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] opacity-75">
            sur 100
          </span>
        </div>
        <div className="flex flex-col items-center gap-3 p-6 text-center">
          <p className="text-[15px] leading-relaxed">{analysis.verdict}</p>
          {analysis.occasion && (
            <span className="rounded-full bg-accent-soft px-3 py-1 text-xs font-semibold text-accent-strong">
              {analysis.occasion}
            </span>
          )}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold">Ce qui marche</h2>
        <ul className="flex flex-col gap-2">
          {analysis.strengths.map((item) => (
            <li key={item} className="flex gap-2 text-sm leading-relaxed">
              <span className="text-success">✓</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold">À ajuster</h2>
        <ul className="flex flex-col gap-2">
          {analysis.improvements.map((item) => (
            <li key={item} className="flex gap-2 text-sm leading-relaxed">
              <span className="text-accent">→</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-semibold">
            Pièces détectées ({analysis.garments.length})
          </h2>
          {analysis.savedToWardrobe && (
            <span className="text-xs text-success">Ajoutées à ta garde-robe</span>
          )}
        </div>

        <ul className="flex flex-col gap-2">
          {analysis.garments.map((garment, index) => (
            <li
              key={`${garment.label}-${index}`}
              className="flex gap-3 rounded-[var(--radius-control)] border border-border-soft bg-surface p-3"
            >
              <GarmentThumb
                imageUrl={photoUrl}
                cropBox={garment.crop_box}
                alt={garment.label}
              />
              <div className="flex min-w-0 flex-col gap-1">
                <span className="truncate text-sm font-semibold">{garment.label}</span>
                <span className="text-xs text-muted">
                  {[garment.color, garment.material].filter(Boolean).join(" · ")}
                </span>
                <BrandLine
                  brand={garment.brand}
                  confidence={garment.brand_confidence}
                />
                {garment.product_matches.length > 0 && (
                  <div className="mt-1 flex flex-col gap-1">
                    <span className="text-[11px] uppercase tracking-wide text-muted">
                      Pièces similaires trouvées
                    </span>
                    {garment.product_matches.map((match) => (
                      <a
                        key={match.url}
                        href={match.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="truncate text-xs font-medium underline underline-offset-2"
                      >
                        {match.title}
                        {match.price ? ` — ${match.price}` : ""}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>

        {!analysis.savedToWardrobe && (
          <p className="rounded-[var(--radius-control)] border border-border bg-accent-soft/60 p-3 text-xs leading-relaxed text-muted">
            Ces pièces ne sont pas conservées avec le plan gratuit. Passe en Pro
            pour construire ta garde-robe au fil des analyses.
          </p>
        )}
      </section>
    </div>
  );
}

/**
 * La marque n'est affichée comme un fait que si elle a été lue sur la photo.
 * Une supposition est présentée comme telle — jamais comme une référence.
 */
function BrandLine({
  brand,
  confidence,
}: {
  brand: string | null;
  confidence: GarmentView["brand_confidence"];
}) {
  if (!brand || confidence === "inconnue") {
    return <span className="text-xs text-muted">Marque non identifiable</span>;
  }

  if (confidence === "suppose") {
    return (
      <span className="text-xs text-muted">
        Ressemble à du <span className="font-medium text-foreground">{brand}</span>{" "}
        (non confirmé)
      </span>
    );
  }

  return (
    <span className="text-xs">
      <span className="font-medium">{brand}</span>{" "}
      <span className="text-muted">— logo visible</span>
    </span>
  );
}
