"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { GarmentThumb } from "@/components/analyze/garment-thumb";
import type { CropBox } from "@/lib/claude/schemas";

export const MAX_PHOTOS = 8;

interface Photo {
  file: File;
  previewUrl: string;
}

interface ScanGarment {
  category: string;
  label: string;
  color: string;
  material: string | null;
  brand: string | null;
  brand_confidence: "logo_visible" | "suppose" | "inconnue";
  crop_box: CropBox;
  source_index: number;
}

interface ScanResult {
  summary: string;
  garments: ScanGarment[];
  outfits: {
    name: string;
    garment_indexes: number[];
    occasion: string;
    why: string;
  }[];
  gaps: { item: string; why: string; priority: "haute" | "moyenne" | "basse" }[];
}

type State =
  | { step: "picking" }
  | { step: "working"; stage: string }
  | { step: "done"; result: ScanResult }
  | { step: "error"; title: string; body: string; upgrade: boolean };

export function DressingScanner() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [state, setState] = useState<State>({ step: "picking" });

  function addFiles(files: FileList) {
    const room = MAX_PHOTOS - photos.length;
    const added = Array.from(files)
      .slice(0, room)
      .map((file) => ({ file, previewUrl: URL.createObjectURL(file) }));
    setPhotos((prev) => [...prev, ...added]);
  }

  function removePhoto(index: number) {
    setPhotos((prev) => {
      URL.revokeObjectURL(prev[index].previewUrl);
      return prev.filter((_, i) => i !== index);
    });
  }

  async function scan() {
    setState({ step: "working", stage: "Envoi de tes photos…" });

    try {
      const supabase = createClient();
      const paths: string[] = [];

      // Séquentiel plutôt que parallèle : sur une 4G de métro, huit uploads
      // simultanés se gênent et échouent plus souvent qu'ils n'accélèrent.
      for (const [index, photo] of photos.entries()) {
        setState({
          step: "working",
          stage: `Envoi de la photo ${index + 1} sur ${photos.length}…`,
        });

        const extension = photo.file.name.split(".").pop()?.toLowerCase() ?? "jpg";
        const urlResponse = await fetch("/api/upload-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ extension }),
        });

        if (!urlResponse.ok) {
          return showRefusal(await urlResponse.json().catch(() => ({})));
        }

        const { path, token } = await urlResponse.json();
        const { error } = await supabase.storage
          .from("outfits")
          .uploadToSignedUrl(path, token, photo.file);

        if (error) {
          setState({
            step: "error",
            title: "L'envoi d'une photo a échoué",
            body: "Vérifie ta connexion et réessaie.",
            upgrade: false,
          });
          return;
        }
        paths.push(path);
      }

      setState({ step: "working", stage: "Inventaire de ton dressing…" });

      const response = await fetch("/api/dressing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imagePaths: paths }),
      });

      if (!response.ok) {
        return showRefusal(await response.json().catch(() => ({})));
      }

      setState({ step: "done", result: await response.json() });
    } catch {
      setState({
        step: "error",
        title: "Quelque chose a coincé",
        body: "Réessaie dans un instant.",
        upgrade: false,
      });
    }
  }

  function showRefusal(payload: {
    error?: string;
    message?: { title: string; body: string };
  }) {
    setState({
      step: "error",
      title: payload.message?.title ?? "Scan indisponible",
      body: payload.message?.body ?? "Réessaie dans un instant.",
      upgrade: payload.error === "plan_required" || payload.error === "quota_exceeded",
    });
  }

  if (state.step === "working") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-5 py-16 text-center">
        <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-border border-t-highlight" />
        <p className="text-sm font-medium">{state.stage}</p>
        <p className="max-w-[30ch] text-xs text-muted">
          Un scan complet prend une minute ou deux. Ne ferme pas cet écran.
        </p>
      </div>
    );
  }

  if (state.step === "error") {
    return (
      <div className="flex flex-col gap-4 rounded-[var(--radius-card)] border border-border-soft bg-surface shadow-[var(--shadow-card)] p-6 text-center">
        <h2 className="text-lg font-semibold">{state.title}</h2>
        <p className="text-sm leading-relaxed text-muted">{state.body}</p>
        {state.upgrade ? (
          <Link href="/billing">
            <Button>Voir les plans</Button>
          </Link>
        ) : (
          <Button variant="secondary" onClick={() => setState({ step: "picking" })}>
            Réessayer
          </Button>
        )}
      </div>
    );
  }

  if (state.step === "done") {
    return (
      <ScanResults
        result={state.result}
        photoUrls={photos.map((p) => p.previewUrl)}
        onRestart={() => {
          setPhotos([]);
          setState({ step: "picking" });
        }}
      />
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-5">
      <div className="flex flex-col gap-2">
        <h1 className="text-[1.9rem] font-extrabold leading-[1.05]">Scanne ton dressing</h1>
        <p className="text-sm leading-relaxed text-muted">
          Prends ta penderie, tes tiroirs ouverts, ou tes pièces posées à plat.
          Jusqu&apos;à {MAX_PHOTOS} photos — plus elles sont lisibles, meilleur est
          l&apos;inventaire.
        </p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(event) => {
          if (event.target.files) addFiles(event.target.files);
          // Permet de re-sélectionner le même fichier après suppression.
          event.target.value = "";
        }}
      />

      {photos.length > 0 && (
        <ul className="grid grid-cols-3 gap-2">
          {photos.map((photo, index) => (
            <li key={photo.previewUrl} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.previewUrl}
                alt={`Photo ${index + 1}`}
                className="aspect-square w-full rounded-2xl object-cover"
              />
              <button
                type="button"
                onClick={() => removePhoto(index)}
                aria-label={`Retirer la photo ${index + 1}`}
                className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-accent/80 text-sm text-accent-foreground"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-col gap-2">
        <Button
          variant={photos.length > 0 ? "secondary" : "primary"}
          onClick={() => inputRef.current?.click()}
          disabled={photos.length >= MAX_PHOTOS}
        >
          {photos.length === 0
            ? "Choisir mes photos"
            : photos.length >= MAX_PHOTOS
              ? `Maximum ${MAX_PHOTOS} photos`
              : "Ajouter des photos"}
        </Button>

        {photos.length > 0 && (
          <Button onClick={scan}>
            Analyser {photos.length} photo{photos.length > 1 ? "s" : ""}
          </Button>
        )}
      </div>
    </div>
  );
}

function ScanResults({
  result,
  photoUrls,
  onRestart,
}: {
  result: ScanResult;
  photoUrls: string[];
  onRestart: () => void;
}) {
  return (
    <div className="flex flex-col gap-7">
      <section className="flex flex-col gap-2 rounded-[var(--radius-card)] border border-border-soft bg-surface shadow-[var(--shadow-card)] p-5">
        <h1 className="text-lg font-semibold">Ton dressing</h1>
        <p className="text-sm leading-relaxed text-muted">{result.summary}</p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold">
          {result.garments.length} pièce{result.garments.length > 1 ? "s" : ""} ajoutée
          {result.garments.length > 1 ? "s" : ""}
        </h2>
        <ul className="flex flex-col gap-2">
          {result.garments.map((garment, index) => (
            <li
              key={`${garment.label}-${index}`}
              className="flex items-center gap-3 rounded-2xl border border-border-soft bg-surface p-3"
            >
              <GarmentThumb
                imageUrl={photoUrls[garment.source_index] ?? ""}
                cropBox={garment.crop_box}
                alt={garment.label}
              />
              <div className="flex min-w-0 flex-col">
                <span className="truncate text-sm font-medium">{garment.label}</span>
                <span className="text-xs text-muted">
                  {[garment.color, garment.material].filter(Boolean).join(" · ")}
                </span>
                {garment.brand && garment.brand_confidence !== "inconnue" && (
                  <span className="truncate text-xs text-muted">
                    {garment.brand_confidence === "logo_visible"
                      ? garment.brand
                      : `${garment.brand} (non confirmé)`}
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>

      {result.outfits.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold">Tenues possibles dès maintenant</h2>
          <ul className="flex flex-col gap-3">
            {result.outfits.map((outfit) => (
              <li
                key={outfit.name}
                className="flex flex-col gap-2 rounded-2xl border border-border-soft bg-surface p-4"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-sm font-semibold">{outfit.name}</span>
                  <span className="flex-none rounded-full bg-accent-soft px-2.5 py-0.5 text-[11px] font-semibold text-accent-strong">
                    {outfit.occasion}
                  </span>
                </div>
                <div className="flex gap-2">
                  {outfit.garment_indexes.map((index) => {
                    const garment = result.garments[index];
                    if (!garment) return null;
                    return (
                      <GarmentThumb
                        key={index}
                        imageUrl={photoUrls[garment.source_index] ?? ""}
                        cropBox={garment.crop_box}
                        alt={garment.label}
                      />
                    );
                  })}
                </div>
                <p className="text-sm leading-relaxed text-muted">{outfit.why}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {result.gaps.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold">Ce qui te manque</h2>
          <ul className="flex flex-col gap-2">
            {result.gaps.map((gap) => (
              <li
                key={gap.item}
                className="flex flex-col gap-1 rounded-2xl border border-border-soft bg-surface p-4"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-sm font-medium">{gap.item}</span>
                  <span className="flex-none text-[11px] uppercase tracking-wide text-muted">
                    {gap.priority}
                  </span>
                </div>
                <p className="text-sm leading-relaxed text-muted">{gap.why}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="flex flex-col gap-2">
        <Link href="/dressing">
          <Button>Voir ma garde-robe</Button>
        </Link>
        <Button variant="ghost" onClick={onRestart}>
          Scanner d&apos;autres photos
        </Button>
      </div>
    </div>
  );
}
