"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { INSTALL_GATE_ENABLED, isOpenPath } from "@/lib/install";
import { InstallGuide } from "./install-guide";
import { LogoMark } from "@/components/brand/logo";

/**
 * Rien du tunnel ne s'affiche tant que l'app n'est pas ouverte depuis l'écran
 * d'accueil.
 *
 * Le signal est `display-mode: standalone` — « cette page a été lancée depuis
 * l'icône ». C'est le seul fait observable : aucune API ne dit « cette personne
 * a installé l'app ». Conséquence directe : on ne peut pas mettre de bouton
 * « c'est bon, j'ai installé ». L'utilisateur franchit la porte en revenant par
 * l'icône, ce qui est aussi la seule preuve honnête.
 *
 * `useSyncExternalStore` plutôt qu'un `useState` + `useEffect` : la valeur vit
 * dans le navigateur, pas dans React. On la lit là où elle est, et on
 * s'abonne à ses changements — un utilisateur peut passer du navigateur à
 * l'app installée sans recharger.
 */
function subscribe(onChange: () => void): () => void {
  const queries = DISPLAY_MODES.map((mode) =>
    window.matchMedia(`(display-mode: ${mode})`)
  );
  for (const query of queries) query.addEventListener("change", onChange);
  return () => {
    for (const query of queries) query.removeEventListener("change", onChange);
  };
}

const DISPLAY_MODES = ["standalone", "fullscreen", "minimal-ui"] as const;

function getSnapshot(): "standalone" | "browser" {
  const launchedFromIcon =
    DISPLAY_MODES.some(
      (mode) => window.matchMedia(`(display-mode: ${mode})`).matches
    ) ||
    // Safari iOS : propriété non standard, mais c'est la seule qui réponde
    // correctement sur les versions d'iOS encore très répandues.
    (window.navigator as Navigator & { standalone?: boolean }).standalone ===
      true;

  return launchedFromIcon ? "standalone" : "browser";
}

/** Sur le serveur, on ne sait pas : on rend l'écran d'attente. */
function getServerSnapshot(): "unknown" {
  return "unknown";
}

export function InstallGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const mode = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  // Porte désactivée le temps que la connexion par code fonctionne : sans elle,
  // le lien reçu par mail — qui s'ouvre dans le navigateur — serait bloqué et
  // personne ne pourrait entrer. Voir `INSTALL_GATE_ENABLED`.
  if (!INSTALL_GATE_ENABLED) return <>{children}</>;

  // Le lien de connexion, les pages légales et le back-office passent toujours.
  // Voir `lib/install.ts` : chacun casserait quelque chose s'il était bloqué.
  if (isOpenPath(pathname)) return <>{children}</>;

  if (mode === "unknown") return <Splash />;
  if (mode === "browser") return <InstallGuide />;
  return <>{children}</>;
}

/**
 * Le temps d'un rendu, entre le HTML du serveur et l'hydratation. Dessiné comme
 * l'écran de lancement d'une app native : c'est exactement ce que c'est.
 */
function Splash() {
  return (
    <div className="flex min-h-dvh flex-1 items-center justify-center bg-accent">
      <LogoMark size={96} priority />
      <span className="sr-only">Chargement de Vesti</span>
    </div>
  );
}
