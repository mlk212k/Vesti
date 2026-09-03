"use client";

import { useState } from "react";
import { REFERRAL_COOKIE } from "@/proxy";
import { normalizeReferralCode } from "@/lib/navigation";

/**
 * Le code de l'influenceur, montré pendant l'installation — un filet, pas le
 * chemin principal.
 *
 * Le chemin principal est le `start_url` du manifeste : l'icône installée
 * s'ouvre avec `?ref=` dans l'URL, et le code se repose tout seul du bon côté
 * de la cloison (voir `app/manifest.webmanifest/route.ts`). Quand ça marche,
 * personne n'a rien à taper.
 *
 * Mais ce comportement dépend du système, et le prix d'un échec silencieux est
 * élevé : l'influenceur n'est crédité de personne, et il n'a aucun moyen de
 * s'en apercevoir. D'où cette carte. Elle ne coûte rien à qui n'en a pas
 * besoin, et sauve l'attribution quand le système n'a pas retenu l'adresse.
 */
export function ReferralKeepsake() {
  const [copied, setCopied] = useState(false);

  // Lu depuis le cookie plutôt que passé en propriété : ce composant vit dans
  // la porte d'entrée, rendue avant qu'on sache quoi que ce soit du visiteur.
  const code = normalizeReferralCode(readCookie(REFERRAL_COOKIE) ?? "");
  if (!code) return null;

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Presse-papier refusé : le code reste lisible à l'écran, ce qui suffit.
    }
  }

  return (
    <section className="flex flex-col gap-2 rounded-[var(--radius-card)] border border-border-soft bg-surface p-4">
      <span className="text-sm font-semibold">Ton code d&apos;invitation</span>
      <div className="flex items-center justify-between gap-3 rounded-[var(--radius-control)] bg-surface-sunken px-4 py-3">
        <span className="font-[family-name:var(--font-bricolage)] text-xl font-extrabold tracking-[0.18em]">
          {code}
        </span>
        <button
          type="button"
          onClick={copy}
          style={{ touchAction: "manipulation" }}
          className="shrink-0 rounded-full bg-accent px-4 py-2 text-xs font-semibold text-accent-foreground transition active:scale-[0.98]"
        >
          {copied ? "Copié" : "Copier"}
        </button>
      </div>
      <p className="text-xs leading-relaxed text-muted">
        Il devrait se remplir tout seul dans l&apos;app. S&apos;il n&apos;y est
        pas, colle-le à l&apos;inscription.
      </p>
    </section>
  );
}

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(
    new RegExp(`(?:^|; )${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}=([^;]*)`)
  );
  return match ? decodeURIComponent(match[1]) : null;
}
