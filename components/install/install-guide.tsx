"use client";

import { useEffect, useState, type ReactNode } from "react";
import { ReferralKeepsake } from "./referral-keepsake";
import { LogoMark } from "@/components/brand/logo";
import { LegalLinks } from "@/components/legal-links";
import { Button } from "@/components/ui/button";
import { detectEnvironment } from "@/lib/install";

/**
 * Événement propre à Chromium : il n'existe dans aucune définition standard,
 * d'où la déclaration locale.
 */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallGuide() {
  const environment = detectEnvironment({
    userAgent: typeof navigator === "undefined" ? "" : navigator.userAgent,
    maxTouchPoints:
      typeof navigator === "undefined" ? 0 : navigator.maxTouchPoints,
  });

  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(
    null
  );
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    // Chrome Android n'émet `beforeinstallprompt` que si un service worker avec
    // un gestionnaire `fetch` est enregistré. Celui de `public/sw.js` ne fait
    // rien d'autre qu'exister pour cette raison — voir le commentaire en tête
    // du fichier.
    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker.register("/sw.js").catch(() => {
        // Enregistrement refusé : il reste les instructions manuelles, qui
        // fonctionnent partout.
      });
    }
  }, []);

  useEffect(() => {
    // L'événement peut arriver après le premier rendu. On l'attrape s'il vient ;
    // les instructions manuelles restent affichées dans tous les cas.
    function onPrompt(event: Event) {
      event.preventDefault();
      setPromptEvent(event as BeforeInstallPromptEvent);
    }
    function onInstalled() {
      setInstalled(true);
    }

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed) return <InstalledConfirmation />;

  // La flèche ne se montre que dans SAFARI. Ailleurs sur iPhone — Chrome,
  // Firefox, Edge — le bouton Partager est dans la barre d'adresse, en haut :
  // une flèche vers le bas y désignerait le vide, et enverrait chercher au
  // mauvais endroit quelqu'un qui suivait pourtant les instructions.
  //
  // Elle est en position fixe, d'où la marge basse : sans elle, elle
  // recouvrirait la fin de la page — dont les liens légaux.
  const showsPointer = environment.isIosSafari;

  return (
    <main
      className={`flex min-h-dvh flex-1 flex-col gap-7 px-6 pt-12 ${
        showsPointer ? "pb-56" : "pb-10"
      }`}
    >
      <header className="flex flex-col items-center gap-4 text-center">
        <LogoMark size={88} priority />
        <h1 className="text-[2rem] font-extrabold leading-[1.05]">
          Installe Vesti sur
          <br />
          ton écran d&apos;accueil
        </h1>
        <p className="max-w-[34ch] text-[15px] leading-relaxed text-muted">
          Vesti s&apos;utilise comme une vraie app : plein écran, en un tap,
          depuis ton écran d&apos;accueil. C&apos;est là que ton analyse
          commence.
        </p>
      </header>

      {environment.inAppBrowser ? (
        <LeaveInAppBrowser
          appName={environment.inAppBrowser}
          os={environment.os}
        />
      ) : environment.os === "ios" ? (
        <IosSteps showPointer={environment.isIosSafari} />
      ) : environment.os === "android" ? (
        <AndroidSteps promptEvent={promptEvent} />
      ) : (
        <OpenOnPhone />
      )}

      {/* Filet de sécurité de l'attribution : le code devrait voyager tout
          seul via le manifeste, mais un échec silencieux ne se verrait de
          personne — ni du filleul, ni de l'influenceur. */}
      <ReferralKeepsake />

      <p className="text-center text-xs leading-relaxed text-muted">
        Une fois l&apos;icône ajoutée, ouvre Vesti depuis ton écran
        d&apos;accueil : cette page laissera place à l&apos;app.
      </p>

      <LegalLinks className="mt-auto pt-6" />
    </main>
  );
}

/* ─── Étape 0 : sortir du navigateur intégré ──────────────────────────────── */

/**
 * Le cas le plus important de tout ce fichier.
 *
 * Le navigateur intégré de TikTok — d'où vient la quasi-totalité du trafic — ne
 * sait pas installer d'application. Sans cette étape, la porte serait fermée à
 * clé pour tout le monde. Sur Android on peut ouvrir Chrome directement via une
 * URL `intent://` ; sur iOS aucun équivalent n'existe, il faut décrire le
 * chemin à la main.
 */
function LeaveInAppBrowser({
  appName,
  os,
}: {
  appName: string;
  os: "ios" | "android" | "other";
}) {
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
    } catch {
      // Presse-papiers refusé (navigateur intégré verrouillé) : les
      // instructions manuelles en dessous restent la voie de secours.
      setCopied(false);
    }
  }

  function openInChrome() {
    const { host, pathname, search } = window.location;
    // Schéma Android : ouvre l'URL dans Chrome, en sortant du webview.
    window.location.href = `intent://${host}${pathname}${search}#Intent;scheme=https;package=com.android.chrome;end`;
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2 rounded-[var(--radius-card)] border border-accent/25 bg-accent-soft p-5">
        <h2 className="text-sm font-bold text-accent-strong">
          D&apos;abord, sors du navigateur de {appName}
        </h2>
        <p className="text-sm leading-relaxed text-foreground/80">
          {appName} ouvre les liens dans son propre navigateur, qui ne sait pas
          installer d&apos;application. Ça prend deux secondes à corriger.
        </p>
      </div>

      {os === "android" && (
        <Button onClick={openInChrome}>Ouvrir dans Chrome</Button>
      )}

      <StepList>
        {os === "ios" ? (
          <>
            <Step index={1}>
              Appuie sur <Glyph label="les trois points">⋯</Glyph> en bas à
              droite de l&apos;écran.
            </Step>
            <Step index={2}>
              Choisis <Strong>« Ouvrir dans le navigateur »</Strong> ou{" "}
              <Strong>« Ouvrir dans Safari »</Strong>.
            </Step>
            <Step index={3}>
              Reprends depuis Safari : cette page t&apos;expliquera la suite.
            </Step>
          </>
        ) : (
          <>
            <Step index={1}>
              Appuie sur <Glyph label="les trois points">⋮</Glyph> en haut à
              droite de l&apos;écran.
            </Step>
            <Step index={2}>
              Choisis <Strong>« Ouvrir dans le navigateur »</Strong> ou{" "}
              <Strong>« Ouvrir dans Chrome »</Strong>.
            </Step>
            <Step index={3}>
              Reprends depuis Chrome : cette page t&apos;expliquera la suite.
            </Step>
          </>
        )}
      </StepList>

      <div className="flex flex-col gap-2">
        <Button variant="secondary" onClick={copyLink}>
          {copied ? "Lien copié ✓" : "Copier le lien"}
        </Button>
        <p className="text-center text-xs text-muted">
          Tu peux aussi coller le lien dans{" "}
          {os === "ios" ? "Safari" : "Chrome"}.
        </p>
      </div>
    </div>
  );
}

/* ─── iOS ─────────────────────────────────────────────────────────────────── */

function IosSteps({ showPointer }: { showPointer: boolean }) {
  return (
    <>
      <StepList>
        <Step index={1} icon={<ShareIcon />}>
          Appuie sur le bouton <Strong>Partager</Strong>{" "}
          {showPointer ? (
            // Safari : la barre d'outils est en bas, et la flèche le désigne.
            <>— tout en bas de l&apos;écran.</>
          ) : (
            // Chrome, Firefox, Edge : il vit dans la barre d'adresse, en haut.
            <>— en haut, dans la barre d&apos;adresse.</>
          )}
        </Step>
        <Step index={2} icon={<AddSquareIcon />}>
          Fais défiler le menu et choisis{" "}
          <Strong>« Sur l&apos;écran d&apos;accueil »</Strong>.
        </Step>
        <Step index={3}>
          Appuie sur <Strong>« Ajouter »</Strong> en haut à droite. L&apos;icône
          Vesti apparaît sur ton écran d&apos;accueil.
        </Step>
      </StepList>
      {showPointer && <SharePointer />}
    </>
  );
}

/**
 * La flèche qui désigne le bouton Partager, en bas de l'écran.
 *
 * ⚠️ C'est le seul levier qui reste sur iPhone. Apple n'expose aucune API pour
 * ajouter une app à l'écran d'accueil : contrairement à Android, on ne peut pas
 * proposer de bouton qui le fasse. Le geste appartient à l'utilisateur, et tout
 * ce qu'on peut faire est de le rendre évident.
 *
 * Trois phrases numérotées ne suffisaient pas : beaucoup ne savent pas à quoi
 * ressemble ce bouton, ni qu'il est en bas. Une flèche qui bouge à l'endroit
 * exact se suit sans rien lire — et l'icône dessinée à côté permet de le
 * reconnaître avant même de baisser les yeux.
 *
 * Positionnée au-dessus de `safe-area-inset-bottom` : sur iPhone, la barre
 * d'outils de Safari occupe cette zone, et s'y superposer reviendrait à cacher
 * ce qu'on cherche à montrer.
 */
function SharePointer() {
  return (
    <div
      // Dégradé vers le fond : le texte qui défile dessous s'efface au lieu de
      // se superposer à la pastille, qui deviendrait illisible.
      className="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex flex-col items-center gap-2 bg-gradient-to-t from-background via-background to-transparent pt-14 pb-[calc(env(safe-area-inset-bottom)+12px)]"
      aria-hidden
    >
      <div className="flex items-center gap-2 rounded-full bg-accent px-4 py-2 shadow-[var(--shadow-lift)]">
        <span className="text-accent-foreground">
          <ShareIcon />
        </span>
        <span className="text-[13px] font-bold text-accent-foreground">
          C&apos;est ce bouton
        </span>
      </div>
      <span className="vesti-point-down text-accent">
        <ChevronDownIcon />
      </span>
    </div>
  );
}

function ChevronDownIcon() {
  return (
    <svg {...iconProps} width={30} height={30} strokeWidth={2.4}>
      <path d="M6 9.5 12 15.5 18 9.5" />
    </svg>
  );
}

/* ─── Android ─────────────────────────────────────────────────────────────── */

function AndroidSteps({
  promptEvent,
}: {
  promptEvent: BeforeInstallPromptEvent | null;
}) {
  return (
    <div className="flex flex-col gap-5">
      {promptEvent && (
        // Chemin en un tap quand Chrome le propose. Les instructions manuelles
        // restent affichées : l'événement n'arrive pas sur tous les appareils
        // ni dans tous les navigateurs Android.
        <Button onClick={() => void promptEvent.prompt()}>
          Installer l&apos;application
        </Button>
      )}

      <StepList>
        <Step index={1}>
          Appuie sur <Glyph label="les trois points">⋮</Glyph> en haut à droite
          de Chrome.
        </Step>
        <Step index={2} icon={<AddSquareIcon />}>
          Choisis <Strong>« Installer l&apos;application »</Strong> ou{" "}
          <Strong>« Ajouter à l&apos;écran d&apos;accueil »</Strong>.
        </Step>
        <Step index={3}>
          Confirme. L&apos;icône Vesti apparaît sur ton écran d&apos;accueil.
        </Step>
      </StepList>
    </div>
  );
}

/* ─── Ordinateur ──────────────────────────────────────────────────────────── */

function OpenOnPhone() {
  return (
    <div className="flex flex-col gap-3 rounded-[var(--radius-card)] border border-border-soft bg-surface p-5 text-center shadow-[var(--shadow-card)]">
      <h2 className="text-sm font-bold">Vesti est fait pour ton téléphone</h2>
      <p className="text-sm leading-relaxed text-muted">
        Tu vas photographier tes tenues : autant le faire depuis l&apos;appareil
        qui a l&apos;appareil photo. Ouvre{" "}
        <Strong>vesti.app</Strong> sur ton mobile, puis ajoute-le à ton écran
        d&apos;accueil.
      </p>
    </div>
  );
}

/* ─── Après installation ──────────────────────────────────────────────────── */

/**
 * Chrome installe l'app mais laisse l'onglet ouvert : sans cet écran, la
 * personne reste sur les instructions et croit que ça n'a pas marché.
 */
function InstalledConfirmation() {
  return (
    <main className="flex min-h-dvh flex-1 flex-col items-center justify-center gap-5 px-6 text-center">
      <LogoMark size={88} />
      <h1 className="text-[2rem] font-extrabold leading-[1.05]">
        C&apos;est installé.
      </h1>
      <p className="max-w-[30ch] text-[15px] leading-relaxed text-muted">
        Ferme cet onglet et ouvre <Strong>Vesti</Strong> depuis ton écran
        d&apos;accueil. Ton analyse commence là.
      </p>
    </main>
  );
}

/* ─── Briques ─────────────────────────────────────────────────────────────── */

function StepList({ children }: { children: ReactNode }) {
  return (
    <ol className="flex flex-col gap-3 rounded-[var(--radius-card)] border border-border-soft bg-surface p-5 shadow-[var(--shadow-card)]">
      {children}
    </ol>
  );
}

function Step({
  index,
  icon,
  children,
}: {
  index: number;
  icon?: ReactNode;
  children: ReactNode;
}) {
  return (
    <li className="flex items-start gap-3">
      <span className="mt-0.5 flex h-7 w-7 flex-none items-center justify-center rounded-full bg-accent text-[13px] font-bold text-accent-foreground">
        {index}
      </span>
      <span className="flex-1 text-sm leading-relaxed">{children}</span>
      {icon && (
        <span className="mt-0.5 flex-none text-accent-strong" aria-hidden>
          {icon}
        </span>
      )}
    </li>
  );
}

function Strong({ children }: { children: ReactNode }) {
  return <strong className="font-semibold text-foreground">{children}</strong>;
}

/** Symbole d'interface cité dans une phrase, annoncé aux lecteurs d'écran. */
function Glyph({ children, label }: { children: ReactNode; label: string }) {
  return (
    <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-md bg-accent-soft px-1.5 align-middle text-[15px] font-bold leading-none text-accent-strong">
      <span aria-hidden>{children}</span>
      <span className="sr-only">{label}</span>
    </span>
  );
}

const iconProps = {
  width: 22,
  height: 22,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

/** Le bouton « Partager » d'iOS : un carré ouvert traversé par une flèche. */
function ShareIcon() {
  return (
    <svg {...iconProps}>
      <path d="M12 3.5v10" />
      <path d="M8.5 7 12 3.5 15.5 7" />
      <path d="M7.5 10.5H6A1.5 1.5 0 0 0 4.5 12v7A1.5 1.5 0 0 0 6 20.5h12a1.5 1.5 0 0 0 1.5-1.5v-7a1.5 1.5 0 0 0-1.5-1.5h-1.5" />
    </svg>
  );
}

function AddSquareIcon() {
  return (
    <svg {...iconProps}>
      <rect x="3.5" y="3.5" width="17" height="17" rx="4.5" />
      <path d="M12 8.5v7M8.5 12h7" />
    </svg>
  );
}
