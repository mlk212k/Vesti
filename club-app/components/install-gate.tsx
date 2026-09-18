"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function detectPlatform(): "ios" | "android" | "other" {
  if (typeof navigator === "undefined") return "other";
  const ua = navigator.userAgent;
  if (/iphone|ipad|ipod/i.test(ua)) return "ios";
  if (/android/i.test(ua)) return "android";
  return "other";
}

// Blocks the whole app behind a full-screen, non-dismissible screen until
// it's running as an installed PWA (not a browser tab) — installed is the
// only mode where push notifications work at all on iOS, so this isn't
// optional polish, it's what makes convocation alerts actually reach
// players' phones.
export function InstallGate() {
  // Visibility itself is handled by CSS (.install-gate, hidden by the
  // pwa-installed class a blocking script sets pre-hydration — see
  // app/layout.tsx) so an installed user never sees this flash on open.
  // "other" is the SSR-safe default for the platform-specific copy below;
  // the effect corrects it right after mount from the real UA.
  const [platform, setPlatform] = useState<"ios" | "android" | "other">(
    "other",
  );
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    // One-time read of navigator.userAgent to correct the SSR-safe default above.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPlatform(detectPlatform());

    function onBeforeInstall(e: Event) {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    }
    function onInstalled() {
      setInstalled(true);
      setDeferredPrompt(null);
    }
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function handleInstallClick() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  }

  return (
    <div className="install-gate fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-background px-6 text-center">
      <Image
        src="/icon-192.png"
        alt=""
        width={72}
        height={72}
        className="rounded-2xl shadow-lg"
      />
      <div className="space-y-2">
        <h1 className="text-xl font-semibold">
          Installe l&apos;app pour continuer
        </h1>
        <p className="text-sm text-muted">
          US Guentrange s&apos;utilise comme une vraie app, installée sur ton
          écran d&apos;accueil — c&apos;est obligatoire pour y accéder
          (notamment pour recevoir les notifications de convocation).
        </p>
      </div>

      {installed && (
        <p className="text-sm font-medium text-accent-strong">
          Installée ✓ — ouvre-la maintenant depuis son icône sur l&apos;écran
          d&apos;accueil.
        </p>
      )}

      {!installed && platform === "ios" && (
        <ol className="max-w-xs space-y-2 text-left text-sm text-foreground">
          <li>
            1. Appuie sur le bouton <strong>Partager</strong> (le carré avec
            la flèche) en bas de Safari.
          </li>
          <li>
            2. Choisis <strong>« Sur l&apos;écran d&apos;accueil »</strong>.
          </li>
          <li>3. Ouvre l&apos;app depuis son icône, pas depuis Safari.</li>
        </ol>
      )}

      {!installed && platform === "android" && (
        <>
          {deferredPrompt ? (
            <button
              type="button"
              onClick={handleInstallClick}
              className="rounded-lg bg-accent px-6 py-3 text-sm font-medium text-white hover:bg-accent-strong"
            >
              Installer l&apos;app
            </button>
          ) : (
            <ol className="max-w-xs space-y-2 text-left text-sm text-foreground">
              <li>1. Ouvre le menu ⋮ en haut à droite de Chrome.</li>
              <li>
                2. Choisis <strong>« Installer l&apos;application »</strong>{" "}
                (ou <strong>« Ajouter à l&apos;écran d&apos;accueil »</strong>).
              </li>
              <li>3. Ouvre l&apos;app depuis son icône.</li>
            </ol>
          )}
        </>
      )}

      {!installed && platform === "other" && (
        <p className="max-w-xs text-sm text-foreground">
          Utilise le menu de ton navigateur pour «&nbsp;Installer
          l&apos;application&nbsp;» ou «&nbsp;Ajouter à l&apos;écran
          d&apos;accueil&nbsp;», puis ouvre-la depuis son icône.
        </p>
      )}
    </div>
  );
}
