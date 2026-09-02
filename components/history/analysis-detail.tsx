"use client";

import { GarmentThumb } from "@/components/analyze/garment-thumb";
import type { GarmentView } from "@/components/analyze/verdict-card";

/**
 * Une analyse relue plus tard.
 *
 * Volontairement proche de l'écran rendu juste après l'analyse — même score en
 * grand, mêmes sections — pour qu'on retrouve ce qu'on a vu, pas une seconde
 * présentation des mêmes faits. Trois différences imposées par ce que la base
 * conserve : la date est affichée, la photo peut manquer (lien expiré, fichier
 * supprimé), et les pièces n'existent que pour les plans qui gardent la
 * garde-robe.
 */
export function AnalysisDetail({
  score,
  occasion,
  createdAt,
  verdict,
  strengths,
  improvements,
  garments,
  photoUrl,
}: {
  score: number | null;
  occasion: string | null;
  createdAt: string;
  verdict: string | null;
  strengths: string[];
  improvements: string[];
  garments: GarmentView[];
  photoUrl: string | null;
}) {
  return (
    <div className="flex flex-col gap-6">
      <section className="overflow-hidden rounded-[var(--radius-card)] border border-border-soft bg-surface shadow-[var(--shadow-card)]">
        <div className="flex flex-col items-center gap-1 bg-accent px-6 py-7 text-accent-foreground">
          <span className="font-display text-[64px] font-extrabold leading-none tracking-[-0.05em] tabular-nums">
            {score ?? "—"}
          </span>
          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] opacity-75">
            sur 100
          </span>
        </div>
        <div className="flex flex-col items-center gap-3 p-6 text-center">
          <span className="text-xs text-muted">
            {new Date(createdAt).toLocaleDateString("fr-FR", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </span>
          {verdict && <p className="text-[15px] leading-relaxed">{verdict}</p>}
          {occasion && (
            <span className="rounded-full bg-accent-soft px-3 py-1 text-xs font-semibold text-accent-strong">
              {occasion}
            </span>
          )}
        </div>
      </section>

      {photoUrl && (
        <div className="overflow-hidden rounded-[var(--radius-card)] border border-border-soft">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photoUrl}
            alt="La tenue analysée"
            className="max-h-[420px] w-full object-cover"
          />
        </div>
      )}

      {strengths.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold">Ce qui marche</h2>
          <ul className="flex flex-col gap-2">
            {strengths.map((item) => (
              <li key={item} className="flex gap-2 text-sm leading-relaxed">
                <span className="text-success">✓</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {improvements.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold">À ajuster</h2>
          <ul className="flex flex-col gap-2">
            {improvements.map((item) => (
              <li key={item} className="flex gap-2 text-sm leading-relaxed">
                <span className="text-accent">→</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {garments.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold">
            Pièces détectées ({garments.length})
          </h2>
          <ul className="flex flex-col gap-2">
            {garments.map((garment, index) => (
              <li
                key={`${garment.label}-${index}`}
                className="flex gap-3 rounded-2xl border border-border-soft bg-surface p-3"
              >
                {photoUrl && (
                  <GarmentThumb
                    imageUrl={photoUrl}
                    cropBox={garment.crop_box}
                    alt={garment.label}
                  />
                )}
                <div className="flex min-w-0 flex-col gap-1">
                  <span className="truncate text-sm font-semibold">{garment.label}</span>
                  <span className="text-xs text-muted">
                    {[garment.color, garment.material].filter(Boolean).join(" · ")}
                  </span>
                  {garment.product_matches.length > 0 && (
                    <div className="mt-1 flex flex-col gap-1">
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
        </section>
      )}
    </div>
  );
}
