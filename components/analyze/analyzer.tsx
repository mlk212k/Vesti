"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { VerdictCard, type AnalysisView } from "./verdict-card";

type State =
  | { step: "idle" }
  | { step: "working"; stage: number }
  | { step: "done"; analysis: AnalysisView }
  | { step: "error"; title: string; body: string; cta: "upgrade" | null };

/** Le verdict se fait attendre : on montre où on en est plutôt qu'un spinner nu. */
const STAGES = [
  "Envoi de ta photo…",
  "Lecture des pièces et des couleurs…",
  "Rédaction du verdict…",
];

export function Analyzer() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<State>({ step: "idle" });
  const [photoUrl, setPhotoUrl] = useState<string>("");

  async function handleFile(file: File) {
    // Aperçu local immédiat : la vignette des pièces s'appuie dessus, aucune
    // requête réseau supplémentaire pour l'afficher.
    setPhotoUrl(URL.createObjectURL(file));
    setState({ step: "working", stage: 0 });

    try {
      const extension = file.name.split(".").pop()?.toLowerCase() ?? "jpg";

      const urlResponse = await fetch("/api/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ extension }),
      });

      if (!urlResponse.ok) {
        const payload = await urlResponse.json().catch(() => ({}));
        return showRefusal(payload);
      }

      const { path, token } = await urlResponse.json();

      const supabase = createClient();
      const { error: uploadError } = await supabase.storage
        .from("outfits")
        .uploadToSignedUrl(path, token, file);

      if (uploadError) {
        setState({
          step: "error",
          title: "L'envoi de la photo a échoué",
          body: "Vérifie ta connexion et réessaie.",
          cta: null,
        });
        return;
      }

      setState({ step: "working", stage: 1 });

      const analyzeResponse = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imagePath: path }),
      });

      if (!analyzeResponse.ok) {
        const payload = await analyzeResponse.json().catch(() => ({}));
        return showRefusal(payload);
      }

      setState({ step: "working", stage: 2 });
      const analysis: AnalysisView = await analyzeResponse.json();
      setState({ step: "done", analysis });
    } catch {
      setState({
        step: "error",
        title: "Quelque chose a coincé",
        body: "Réessaie dans un instant.",
        cta: null,
      });
    }
  }

  function showRefusal(payload: {
    error?: string;
    message?: { title: string; body: string; cta?: string };
  }) {
    const upgradeable =
      payload.error === "quota_exceeded" || payload.error === "plan_required";
    setState({
      step: "error",
      title: payload.message?.title ?? "Analyse indisponible",
      body: payload.message?.body ?? "Réessaie dans un instant.",
      cta: upgradeable ? "upgrade" : null,
    });
  }

  if (state.step === "done") {
    return (
      <div className="flex flex-col gap-6">
        <VerdictCard analysis={state.analysis} photoUrl={photoUrl} />
        <Button variant="secondary" onClick={() => setState({ step: "idle" })}>
          Analyser une autre tenue
        </Button>
      </div>
    );
  }

  if (state.step === "working") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-6 py-16 text-center">
        {photoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photoUrl}
            alt="Ta tenue"
            className="h-48 w-48 rounded-3xl object-cover"
          />
        )}
        <div className="flex flex-col gap-2">
          {STAGES.map((label, index) => (
            <p
              key={label}
              className={`text-sm transition-opacity ${
                index === state.stage
                  ? "font-semibold opacity-100"
                  : index < state.stage
                    ? "text-muted opacity-60"
                    : "text-muted opacity-30"
              }`}
            >
              {label}
            </p>
          ))}
        </div>
      </div>
    );
  }

  if (state.step === "error") {
    return (
      <div className="flex flex-col gap-4 rounded-[var(--radius-card)] border border-border-soft bg-surface shadow-[var(--shadow-card)] p-6 text-center">
        <h2 className="text-lg font-semibold">{state.title}</h2>
        <p className="text-sm leading-relaxed text-muted">{state.body}</p>
        {state.cta === "upgrade" ? (
          <Link href="/billing" className="w-full">
            <Button>Voir les plans</Button>
          </Link>
        ) : (
          <Button variant="secondary" onClick={() => setState({ step: "idle" })}>
            Réessayer
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col justify-center gap-6 py-10 text-center">
      <div className="flex flex-col gap-2">
        <h1 className="text-[1.9rem] font-extrabold leading-[1.05]">Montre-moi ta tenue</h1>
        <p className="text-sm leading-relaxed text-muted">
          Une photo en pied, ou la tenue posée à plat. Chaussures comprises.
        </p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        // `capture` ouvre directement l'appareil photo sur mobile : un tap de
        // moins entre l'envie et le verdict.
        capture="environment"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) handleFile(file);
        }}
      />

      <div className="flex flex-col gap-2">
        <Button onClick={() => inputRef.current?.click()}>Prendre ma tenue en photo</Button>
        <Button
          variant="secondary"
          onClick={() => {
            if (inputRef.current) {
              inputRef.current.removeAttribute("capture");
              inputRef.current.click();
            }
          }}
        >
          Choisir dans ma galerie
        </Button>
      </div>
    </div>
  );
}
