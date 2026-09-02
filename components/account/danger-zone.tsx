"use client";

import { useState } from "react";
import { Button, buttonClasses } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { DELETE_CONFIRMATION, isDeletionConfirmed } from "@/lib/account";

type State =
  | { step: "idle" }
  | { step: "confirming" }
  | { step: "deleting" }
  | { step: "error"; title: string; body: string };

export function DangerZone() {
  const [state, setState] = useState<State>({ step: "idle" });
  const [confirmation, setConfirmation] = useState("");

  async function deleteAccount() {
    setState({ step: "deleting" });
    try {
      const response = await fetch("/api/account/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        setState({
          step: "error",
          title: payload.message?.title ?? "Suppression impossible",
          body: payload.message?.body ?? "Réessaie dans un instant.",
        });
        return;
      }

      // Rechargement complet volontaire, et non `router.push()` : le cache du
      // routeur contient encore les pages RSC rendues avec les données du
      // compte supprimé. Seul un nouveau document les jette. `replace` plutôt
      // que `assign` pour que le bouton « précédent » ne ramène pas sur un
      // dashboard fantôme.
      window.location.replace("/");
    } catch {
      setState({
        step: "error",
        title: "Suppression impossible",
        body: "Réessaie dans un instant.",
      });
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-3 rounded-[var(--radius-card)] border border-border-soft bg-surface shadow-[var(--shadow-card)] p-5">
        <h2 className="text-sm font-semibold">Récupérer mes données</h2>
        <p className="text-sm leading-relaxed text-muted">
          Télécharge tout ce que Vesti sait de toi : profil, analyses,
          garde-robe, abonnement, et des liens pour récupérer tes photos.
        </p>
        {/*
          Un vrai lien, pas un fetch : le navigateur gère le téléchargement via
          le Content-Disposition de la route, sans jamais garder l'export en
          mémoire ni le passer par un blob:.
        */}
        <a
          href="/api/account/export"
          download
          className={buttonClasses("secondary")}
        >
          Télécharger mes données
        </a>
      </section>

      <section className="flex flex-col gap-3 rounded-[var(--radius-card)] border border-danger/25 bg-danger-soft p-5">
        <h2 className="text-sm font-semibold text-danger">Supprimer mon compte</h2>
        <p className="text-sm leading-relaxed text-muted">
          Ton compte, tes photos, ta garde-robe et ton historique sont effacés
          définitivement. Ton abonnement est annulé au passage.{" "}
          <strong className="text-foreground">C&apos;est irréversible</strong> —
          pense à exporter tes données avant.
        </p>

        {state.step === "idle" && (
          <Button variant="secondary" onClick={() => setState({ step: "confirming" })}>
            Supprimer mon compte
          </Button>
        )}

        {(state.step === "confirming" || state.step === "deleting") && (
          <div className="flex flex-col gap-3">
            <Field
              label={`Écris « ${DELETE_CONFIRMATION} » pour confirmer`}
              hint="Cette étape existe pour qu'aucun compte ne parte sur un clic distrait."
            >
              <Input
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                autoCapitalize="characters"
                autoComplete="off"
                placeholder={DELETE_CONFIRMATION}
              />
            </Field>
            <Button
              variant="danger"
              onClick={deleteAccount}
              disabled={!isDeletionConfirmed(confirmation) || state.step === "deleting"}
            >
              {state.step === "deleting"
                ? "Suppression…"
                : "Supprimer définitivement"}
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setConfirmation("");
                setState({ step: "idle" });
              }}
              disabled={state.step === "deleting"}
            >
              Annuler
            </Button>
          </div>
        )}

        {state.step === "error" && (
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium text-danger">{state.title}</p>
            <p className="text-sm leading-relaxed text-muted">{state.body}</p>
            <Button variant="ghost" onClick={() => setState({ step: "idle" })}>
              Fermer
            </Button>
          </div>
        )}
      </section>
    </div>
  );
}
