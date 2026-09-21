"use client";

import { useCallback, useEffect, useRef } from "react";
import { jouer } from "@/lib/sfx";

/**
 * L'OBJET.
 *
 * Une carte NFC en volume, au milieu du vide. C'est la seule surface
 * interactive de l'écran d'accueil : il n'y a pas de bouton à côté d'elle,
 * elle EST le bouton — et son état est l'état de la journée.
 *
 * Trois choix d'implémentation, et pourquoi :
 *
 *   1. TOUT PASSE PAR DES REFS ET DES VARIABLES CSS, jamais par du `state`.
 *      Un `setState` à chaque `pointermove` déclencherait un rendu React par
 *      image, soit soixante par seconde pour un objet qui n'a aucune donnée
 *      à recalculer. On écrit directement dans le style de l'élément ; React
 *      ne sait rien de la rotation en cours, et c'est très bien.
 *
 *   2. L'INERTIE EST UNE VRAIE INTÉGRATION, pas une transition CSS. On
 *      mesure la vitesse angulaire des derniers instants du geste, puis on
 *      la laisse décroître dans une boucle `requestAnimationFrame` avant de
 *      rendre la main au ressort CSS. Sans ça, l'objet s'arrête pile où le
 *      doigt le lâche : c'est ce qui fait « interface » au lieu de
 *      « matière ».
 *
 *   3. L'APPUI LONG EST RÉVERSIBLE ET VISIBLE. L'anneau se remplit en
 *      450 ms ; relâcher avant la fin annule, et on le voit. Un appui long
 *      invisible est un piège.
 *
 * Le composant ne calcule RIEN de métier : `charge` lui arrive déjà cuite
 * depuis le serveur. Il ne sait pas ce qu'est une carte ni un euro.
 */

const ROTATION_MAX = 13; // degrés
const APPUI_LONG = 450; // ms
const FROTTEMENT = 0.94; // décroissance de la vitesse, par image

type Props = {
  /** De 0 à 1 : le remplissage de la tranche. Vient du serveur. */
  charge: number;
  /** Journée validée : la matière est figée, elle ne réagit plus. */
  scellee?: boolean;
  /** Déclenché par un appui long. Absent = l'objet n'ouvre rien. */
  onOuvrir?: () => void;
  /** Libellé annoncé aux lecteurs d'écran et affiché au clavier. */
  action?: string;
  children?: React.ReactNode;
};

export function Dalle({ charge, scellee = false, onOuvrir, action, children }: Props) {
  const dalleRef = useRef<HTMLDivElement>(null);
  const anneauRef = useRef<HTMLDivElement>(null);
  const surveille = useRef(0);

  // Tout l'état du geste vit ici : rien de tout ça ne concerne le rendu.
  const geste = useRef({
    actif: false,
    rx: 0,
    ry: 0,
    vx: 0,
    vy: 0,
    dernierX: 0,
    dernierY: 0,
    debut: 0,
    ouvert: false,
    image: 0,
  });

  const applique = useCallback((rx: number, ry: number) => {
    const el = dalleRef.current;
    if (!el) return;
    el.style.transform = `rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg)`;
  }, []);

  const arrete = useCallback(() => {
    if (geste.current.image) {
      cancelAnimationFrame(geste.current.image);
      geste.current.image = 0;
    }
  }, []);

  // La boucle d'inertie : on continue le mouvement du doigt, en le
  // freinant, puis on laisse la transition élastique du CSS ramener la
  // dalle à plat.
  const lance = useCallback(() => {
    arrete();
    const boucle = () => {
      const g = geste.current;
      g.vx *= FROTTEMENT;
      g.vy *= FROTTEMENT;
      g.rx = Math.max(-ROTATION_MAX, Math.min(ROTATION_MAX, g.rx + g.vx));
      g.ry = Math.max(-ROTATION_MAX, Math.min(ROTATION_MAX, g.ry + g.vy));
      applique(g.rx, g.ry);

      if (Math.abs(g.vx) > 0.04 || Math.abs(g.vy) > 0.04) {
        g.image = requestAnimationFrame(boucle);
        return;
      }

      // Rendu au ressort : on remet la classe qui porte la transition, et la
      // dalle revient d'elle-même, avec un léger dépassement.
      g.image = 0;
      const el = dalleRef.current;
      if (el) {
        el.classList.remove("dalle-tenue");
        el.style.transform = "";
      }
    };
    geste.current.image = requestAnimationFrame(boucle);
  }, [applique, arrete]);

  useEffect(
    () => () => {
      arrete();
      if (surveille.current) cancelAnimationFrame(surveille.current);
    },
    [arrete],
  );

  const lumiere = useCallback((clientX: number, clientY: number) => {
    const el = dalleRef.current;
    if (!el) return { x: 0.5, y: 0.5 };
    const r = el.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (clientX - r.left) / r.width));
    const y = Math.max(0, Math.min(1, (clientY - r.top) / r.height));
    el.style.setProperty("--lx", `${(x * 100).toFixed(1)}%`);
    el.style.setProperty("--ly", `${(y * 100).toFixed(1)}%`);
    return { x, y };
  }, []);

  const declenche = useCallback(() => {
    jouer("pop");
    navigator.vibrate?.(12);
    onOuvrir?.();
  }, [onOuvrir]);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (scellee) return;
    const el = dalleRef.current;
    if (!el) return;

    arrete();
    el.setPointerCapture(e.pointerId);
    el.classList.add("dalle-tenue");

    const g = geste.current;
    g.actif = true;
    g.vx = 0;
    g.vy = 0;
    g.dernierX = e.clientX;
    g.dernierY = e.clientY;
    g.debut = performance.now();
    g.ouvert = false;

    lumiere(e.clientX, e.clientY);
    // L'enfoncement : la matière encaisse la pression.
    el.style.transform = "scale(0.985)";

    if (onOuvrir) {
      const anneau = anneauRef.current;
      if (anneau) {
        const r = el.getBoundingClientRect();
        anneau.style.left = `${e.clientX - r.left}px`;
        anneau.style.top = `${e.clientY - r.top}px`;
        anneau.style.setProperty("--progression", "0");
        anneau.style.opacity = "1";
      }
      // L'appui long doit aboutir même si le doigt ne bouge plus d'un seul
      // pixel : c'est le temps qu'on surveille, pas le mouvement. Cette
      // boucle ne vit que pendant le contact.
      surveille.current = requestAnimationFrame(function suit() {
        const g = geste.current;
        if (!g.actif || !g.debut || g.ouvert) {
          surveille.current = requestAnimationFrame(suit);
          return;
        }
        const p = Math.min(1, (performance.now() - g.debut) / APPUI_LONG);
        anneauRef.current?.style.setProperty("--progression", String(p));
        if (p >= 1) {
          g.ouvert = true;
          declenche();
        }
        surveille.current = requestAnimationFrame(suit);
      });
    }
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (scellee) return;
    const g = geste.current;
    const el = dalleRef.current;
    if (!el) return;

    const { x, y } = lumiere(e.clientX, e.clientY);
    if (!g.actif) return;

    const dx = e.clientX - g.dernierX;
    const dy = e.clientY - g.dernierY;
    g.dernierX = e.clientX;
    g.dernierY = e.clientY;

    // Un geste franc annule l'appui long : on ne peut pas à la fois faire
    // tourner l'objet et l'ouvrir.
    if (Math.abs(dx) + Math.abs(dy) > 6) {
      g.debut = 0;
      if (anneauRef.current) anneauRef.current.style.opacity = "0";
    }

    // La vitesse sert à l'inertie du relâchement.
    g.vy = dx * 0.12;
    g.vx = -dy * 0.1;
    g.ry = Math.max(-ROTATION_MAX, Math.min(ROTATION_MAX, (x - 0.5) * 2 * ROTATION_MAX));
    g.rx = Math.max(-ROTATION_MAX, Math.min(ROTATION_MAX, -(y - 0.5) * 2 * (ROTATION_MAX * 0.7)));
    applique(g.rx, g.ry);

    // Progression de l'appui long, tant que le doigt ne se promène pas.
    if (onOuvrir && g.debut && anneauRef.current) {
      const p = Math.min(1, (performance.now() - g.debut) / APPUI_LONG);
      anneauRef.current.style.setProperty("--progression", String(p));
      if (p >= 1 && !g.ouvert) {
        g.ouvert = true;
        declenche();
      }
    }
  };

  const relache = () => {
    const g = geste.current;
    if (!g.actif) return;
    g.actif = false;
    g.debut = 0;
    if (surveille.current) {
      cancelAnimationFrame(surveille.current);
      surveille.current = 0;
    }
    if (anneauRef.current) anneauRef.current.style.opacity = "0";
    lance();
  };

  return (
    <div className="scene relative select-none">
      <div
        ref={dalleRef}
        role={onOuvrir ? "button" : undefined}
        tabIndex={onOuvrir ? 0 : undefined}
        aria-label={action}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={relache}
        onPointerCancel={relache}
        onPointerLeave={relache}
        // Au clavier, l'appui long n'a aucun sens : une touche suffit.
        onKeyDown={(e) => {
          if (!onOuvrir) return;
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            declenche();
          }
        }}
        style={{ "--charge": String(Math.max(0, Math.min(1, charge))) } as React.CSSProperties}
        className={`dalle ${scellee ? "dalle-scellee" : "dalle-vivante"} ${
          onOuvrir ? "cursor-pointer" : ""
        }`}
      >
        {/* Le lustre : la bande de lumière qui balaie le métal en continu.
            C'est un ÉLÉMENT et non un pseudo-élément parce que `.dalle`
            utilise déjà ses deux `::before` / `::after` — l'un pour le
            liseré irisé, l'autre pour la tranche qui se charge. */}
        <span className="lustre" aria-hidden="true" />

        <div className="absolute inset-0 overflow-hidden rounded-[7%]">
          {children}
          {onOuvrir ? (
            <div
              ref={anneauRef}
              className="anneau"
              style={{ opacity: 0, transition: "opacity 0.18s linear" }}
              aria-hidden="true"
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
