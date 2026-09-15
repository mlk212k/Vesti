"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { LogoMark } from "@/components/brand/logo";
import {
  InstallSteps,
  useInstallPrompt,
} from "./install-guide";
import { useLaunchedFromIcon } from "./install-gate";

/**
 * « Garde Vesti à portée de main », proposé APRÈS le premier verdict.
 *
 * ── Pourquoi ici et pas à l'entrée ──────────────────────────────────────────
 *
 * L'app a longtemps exigé d'être installée avant de rien montrer. Trois jours
 * de mesure ont donné le verdict : 194 personnes sur l'écran d'installation,
 * 6 de l'autre côté. 3 %. On demandait un engagement avant d'avoir prouvé quoi
 * que ce soit — et 86 % de ces gens venaient du navigateur de TikTok, qui ne
 * sait même pas installer une PWA.
 *
 * L'installation reste pourtant ce qui fait revenir : une icône sur l'écran
 * d'accueil est un rappel permanent, et le décrochage au deuxième jour est le
 * vrai problème du produit. D'où ce déplacement plutôt qu'une suppression : la
 * même demande, au moment où elle se mérite — l'écran du verdict, quand la
 * personne vient de recevoir quelque chose et sait enfin ce qu'elle installe.
 *
 * ── Trois règles de politesse, qui sont aussi trois règles de conversion ────
 *
 *  1. Invisible pour qui est déjà entré par l'icône. `useLaunchedFromIcon()`
 *     est le seul fait observable ; aucune API ne dit « cette personne a
 *     installé l'app ».
 *  2. Repliée par défaut. Les instructions complètes tiennent en une dizaine de
 *     lignes selon le navigateur : les déployer d'office sous un verdict qu'on
 *     vient de lire, c'est reproduire la porte un cran plus loin.
 *  3. Un refus est définitif. « Plus tard » ne reporte pas l'invitation au
 *     prochain verdict : il la retire. Redemander à chaque analyse
 *     transformerait un outil de rétention en raison de partir.
 */

/** Un refus vaut pour cet appareil, ce qui est exactement la bonne portée :
 *  l'installation elle-même est propre à l'appareil. */
const DISMISSED_KEY = "vesti_install_invite_dismissed";

function readDismissed(): boolean {
  // Un navigateur privé, des données de site bloquées ou effacées : l'accès
  // peut lever. On préfère alors montrer l'invitation que planter l'écran du
  // verdict, qui est la seule chose que la personne est venue chercher.
  try {
    return window.localStorage.getItem(DISMISSED_KEY) === "1";
  } catch {
    return false;
  }
}

function writeDismissed(): void {
  try {
    window.localStorage.setItem(DISMISSED_KEY, "1");
  } catch {
    // Refus d'écriture : l'invitation reviendra au prochain verdict. Désagréable,
    // pas cassé — et rien d'autre ne dépend de cette valeur.
  }
}

export function InstallInvite() {
  const launchedFromIcon = useLaunchedFromIcon();
  const { promptEvent, installed } = useInstallPrompt();

  const [dismissed, setDismissed] = useState(false);
  const [open, setOpen] = useState(false);

  /* Lu au premier rendu plutôt que dans un effet : passer par `useState` avec
     initialiseur évite d'afficher l'invitation une fraction de seconde à
     quelqu'un qui l'a déjà refusée. Sur le serveur, `window` n'existe pas —
     l'écran du verdict n'est jamais rendu côté serveur, mais la garde coûte
     une ligne et évite un plantage si ça changeait. */
  const [alreadyRefused] = useState(() =>
    typeof window === "undefined" ? false : readDismissed()
  );

  // Déjà dans l'app : l'invitation n'a aucun sens.
  if (launchedFromIcon) return null;
  if (dismissed || alreadyRefused) return null;

  if (installed) {
    return (
      <section className="flex flex-col items-center gap-2 panel p-5 text-center">
        <LogoMark size={40} />
        <p className="text-sm font-semibold">Vesti est sur ton écran d&apos;accueil</p>
        <p className="text-[13px] leading-relaxed text-muted">
          Ouvre-la depuis l&apos;icône la prochaine fois : tu retrouveras ta
          garde-robe directement.
        </p>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-4 panel p-5">
      <div className="flex items-start gap-3">
        <LogoMark size={40} />
        <div className="flex flex-col gap-1">
          <h2 className="text-[15px] leading-tight">
            Garde Vesti à portée de main
          </h2>
          <p className="text-[13px] leading-relaxed text-muted">
            Ajoute l&apos;icône à ton écran d&apos;accueil : tes pièces et tes
            analyses t&apos;attendent en un tap, sans repasser par le navigateur.
          </p>
        </div>
      </div>

      {open ? (
        <InstallSteps promptEvent={promptEvent} />
      ) : (
        <div className="flex flex-col gap-2">
          <Button onClick={() => setOpen(true)}>Ajouter à l&apos;écran d&apos;accueil</Button>
          <Button
            variant="ghost"
            onClick={() => {
              writeDismissed();
              setDismissed(true);
            }}
          >
            Plus tard
          </Button>
        </div>
      )}
    </section>
  );
}
