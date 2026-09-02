"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { downscaleImage } from "@/lib/image/downscale";
import { Button } from "@/components/ui/button";
import { VerdictCard, type AnalysisView } from "./verdict-card";
import { AnalysisProgress } from "./analysis-progress";

type State =
  | { step: "idle" }
  | { step: "working"; stage: number }
  | { step: "done"; analysis: AnalysisView }
  | {
      step: "error";
      title: string;
      body: string;
      cta: "upgrade" | null;
      /** Chemin de la photo déjà envoyée, quand on peut relancer sans la reprendre. */
      resumePath?: string;
    };

export function Analyzer() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<State>({ step: "idle" });
  const [photoUrl, setPhotoUrl] = useState<string>("");

  async function handleFile(original: File) {
    // Aperçu local immédiat : la vignette des pièces s'appuie dessus, aucune
    // requête réseau supplémentaire pour l'afficher. Il montre la photo
    // d'origine, pas la version réduite — c'est ce que la personne a cadré.
    setPhotoUrl(URL.createObjectURL(original));
    setState({ step: "working", stage: 0 });

    try {
      // Réduite avant l'envoi. Sur un réseau mobile, expédier 5 Mo au lieu de
      // 200 Ko, c'est plusieurs secondes d'attente et une connexion de plus à
      // tenir longtemps — donc une de plus à pouvoir tomber.
      const { file } = await downscaleImage(original);
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

      await runAnalysis(path);
    } catch {
      setState({
        step: "error",
        title: "L'envoi de la photo a échoué",
        body: "Vérifie ta connexion et réessaie.",
        cta: null,
      });
    }
  }

  /**
   * L'analyse elle-même, isolée pour pouvoir être RELANCÉE sur la même photo.
   *
   * C'est ce qui donne son sens au bouton « Reprendre l'analyse » : la photo
   * est déjà envoyée, seul le verdict manque. La route rendant le verdict déjà
   * calculé pour un même chemin, relancer récupère le travail fait au lieu de
   * le refaire — et sans reprendre un crédit.
   */
  async function runAnalysis(path: string) {
    setState({ step: "working", stage: 1 });

    try {
      const analyzeResponse = await postAnalyze(path);

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
        title: "La connexion s'est interrompue",
        body: "Ta photo est bien envoyée. Reprends l'analyse : si elle est allée au bout, ton verdict te sera rendu sans consommer un second crédit.",
        cta: null,
        resumePath: path,
      });
    }
  }

  /**
   * Lance l'analyse, et réessaie si la CONNEXION tombe.
   *
   * ⚠️ Le défaut que ça corrige : l'analyse dure une trentaine de secondes, et
   * une connexion mobile faible ne tient pas toujours aussi longtemps. Le
   * `fetch` était alors rejeté et l'app affichait « Quelque chose a coincé »,
   * alors que le serveur, lui, terminait souvent son travail — crédit
   * décompté, verdict enregistré, jamais affiché.
   *
   * Comme la route rend désormais le verdict déjà calculé pour une même photo,
   * réessayer ne relance pas d'analyse : ça récupère celle qui existe. Le seul
   * cas où un nouvel appel au modèle a lieu est celui où rien n'avait abouti.
   *
   * On ne réessaie QUE sur une exception réseau. Une réponse d'erreur du
   * serveur — quota épuisé, photo refusée — est une décision, pas un incident :
   * la marteler ne la changerait pas.
   */
  async function postAnalyze(path: string): Promise<Response> {
    let lastError: unknown;

    for (let attempt = 0; attempt < 3; attempt++) {
      // Un onglet mobile peut garder une requête morte ouverte indéfiniment ;
      // sans plafond, l'écran d'attente tournerait pour toujours.
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 100_000);

      try {
        return await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imagePath: path }),
          signal: controller.signal,
        });
      } catch (error) {
        lastError = error;
        // Court palier avant de reprendre : sur une coupure réseau, repartir
        // dans la seconde retombe en général sur la même coupure.
        await new Promise((resolve) => setTimeout(resolve, 1500 * (attempt + 1)));
      } finally {
        clearTimeout(timeout);
      }
    }

    throw lastError;
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
    return <AnalysisProgress photoUrl={photoUrl} stage={state.stage} />;
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
        ) : state.resumePath ? (
          // La photo est déjà en ligne : on relance l'analyse dessus plutôt que
          // de renvoyer la personne reprendre une photo qu'elle a déjà donnée.
          <div className="flex flex-col gap-2">
            <Button onClick={() => runAnalysis(state.resumePath!)}>
              Reprendre l&apos;analyse
            </Button>
            <Button variant="secondary" onClick={() => setState({ step: "idle" })}>
              Changer de photo
            </Button>
          </div>
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
