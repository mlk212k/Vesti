"use client"

import {
  AlertCircle,
  ExternalLink,
  Loader2,
  Pause,
  Play,
  Radio,
  Volume1,
  Volume2,
  VolumeX,
  X,
} from "lucide-react"
import Link from "next/link"
import { radioConfig } from "@/config/radioConfig"
import { programmeEnCours } from "@/lib/radio/grille"
import { useMaintenant } from "@/lib/radio/horloge"
import {
  basculer,
  basculerMuet,
  chercher,
  effacerErreur,
  reglerVolume,
  retourDirect,
  type RaisonErreur,
} from "@/lib/radio/moteur"
import type { GrilleClient } from "@/lib/radio/types"
import { useLecteur, useSuiviTitre } from "@/lib/radio/useLecteur"
import { chrono } from "@/lib/utils/dates"
import { cn } from "@/lib/utils/cn"

const MESSAGES: Record<RaisonErreur, string> = {
  "non-configure": "Le flux du direct n'est pas encore branché sur ce site.",
  reseau: "Connexion perdue. Vérifiez votre réseau puis réessayez.",
  lecture: "Le direct est momentanément indisponible. Réessayez dans un instant.",
  bloque: "Votre navigateur a bloqué la lecture. Touchez ▶ pour lancer le son.",
}

/**
 * Barre de lecture persistante, en bas de chaque page. C'est là que la
 * radio vit : elle ne disparaît jamais, et suit la navigation.
 */
export function LecteurBarre({ grille }: { grille: GrilleClient }) {
  const l = useLecteur()
  useSuiviTitre()
  const maintenant = useMaintenant()
  const programme = maintenant
    ? programmeEnCours(grille, new Date(maintenant), radioConfig.timeZone)
    : null

  const joue = l.statut === "playing"
  const charge = l.statut === "loading"
  const direct = l.source === "direct"
  const ligne1 = direct
    ? (programme?.emission.nom ?? radioConfig.radioName)
    : (l.episode?.titre ?? "")
  const ligne2 = direct
    ? l.titreEnCours
      ? [l.titreEnCours.artiste, l.titreEnCours.titre].filter(Boolean).join(" — ")
      : programme
        ? radioConfig.radioName
        : "France · Luxembourg · Allemagne"
    : (l.episode?.sousTitre ?? "Podcast")

  const IconeVolume = l.muet || l.volume === 0 ? VolumeX : l.volume < 0.5 ? Volume1 : Volume2

  return (
    <div
      role="region"
      aria-label="Lecteur radio"
      className="border-nuit-trait bg-nuit/95 text-nuit-encre supports-[backdrop-filter]:bg-nuit/88 fixed inset-x-0 bottom-0 z-40 border-t pb-[env(safe-area-inset-bottom)] backdrop-blur"
    >
      {!direct && l.dureeMedia > 0 && (
        <input
          type="range"
          min={0}
          max={l.dureeMedia}
          step={1}
          value={l.position}
          onChange={(e) => chercher(Number(e.target.value))}
          aria-label="Position dans l'épisode"
          aria-valuetext={`${chrono(l.position)} sur ${chrono(l.dureeMedia)}`}
          className="barre-progression absolute inset-x-0 -top-[3px] h-[5px] w-full cursor-pointer"
          style={{ ["--p" as string]: `${(l.position / l.dureeMedia) * 100}%` }}
        />
      )}
      <div className="conteneur flex h-[var(--barre-lecteur)] items-center gap-3 sm:gap-4">
        <button
          type="button"
          onClick={basculer}
          aria-label={joue || charge ? "Pause" : direct ? "Écouter le direct" : "Lire l'épisode"}
          className={cn(
            "grid size-11 flex-none place-items-center rounded-full transition-colors",
            direct
              ? "bg-direct text-sur-direct hover:brightness-110"
              : "bg-accent text-sur-accent hover:brightness-105",
          )}
        >
          {charge ? (
            <Loader2 className="size-5 animate-spin" aria-hidden />
          ) : joue ? (
            <Pause className="size-5 fill-current" aria-hidden />
          ) : (
            <Play className="size-5 translate-x-px fill-current" aria-hidden />
          )}
        </button>

        <div className="min-w-0 flex-1" aria-live="polite">
          {l.erreur ? (
            <div className="flex items-center gap-2 text-sm">
              <AlertCircle className="text-nuit-encre-2 size-4 flex-none" aria-hidden />
              <span className="text-nuit-encre-2 line-clamp-2 leading-snug">
                {MESSAGES[l.erreur]}
              </span>
              {l.erreur === "non-configure" && radioConfig.radiokingUrl && (
                <a
                  href={radioConfig.radiokingUrl}
                  target="_blank"
                  rel="noopener"
                  className="lien text-nuit-encre flex-none font-semibold"
                >
                  Player externe
                </a>
              )}
              <button
                type="button"
                onClick={effacerErreur}
                aria-label="Fermer le message"
                className="hover:bg-nuit-3 ml-auto flex-none rounded p-1"
              >
                <X className="size-4" aria-hidden />
              </button>
            </div>
          ) : (
            <>
              <p className="text-nuit-encre-2 flex items-center gap-2 text-[0.68rem] font-bold tracking-[0.14em] uppercase">
                {direct ? (
                  <>
                    <span className="point-direct" data-actif={joue} />
                    <span className={cn(joue && "text-nuit-encre")}>En direct</span>
                  </>
                ) : (
                  <>
                    <span className="egaliseur" data-actif={joue} aria-hidden>
                      <i />
                      <i />
                      <i />
                    </span>
                    <span>
                      Replay
                      {l.dureeMedia > 0 && ` · ${chrono(l.position)} / ${chrono(l.dureeMedia)}`}
                    </span>
                  </>
                )}
              </p>
              <p className="truncate text-[0.95rem] leading-tight font-bold">{ligne1}</p>
              <p className="text-nuit-encre-2 truncate text-xs">{ligne2}</p>
            </>
          )}
        </div>

        {!direct && (
          <button
            type="button"
            onClick={retourDirect}
            className="border-nuit-trait hover:border-nuit-encre hidden items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold tracking-wider uppercase sm:inline-flex"
          >
            <Radio className="size-3.5" aria-hidden />
            Revenir au direct
          </button>
        )}

        <div className="hidden items-center gap-2 md:flex">
          <button
            type="button"
            onClick={basculerMuet}
            aria-label={l.muet ? "Rétablir le son" : "Couper le son"}
            className="hover:bg-nuit-3 rounded p-1.5"
          >
            <IconeVolume className="size-5" aria-hidden />
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={l.muet ? 0 : l.volume}
            onChange={(e) => reglerVolume(Number(e.target.value))}
            aria-label="Volume"
            aria-valuetext={`${Math.round((l.muet ? 0 : l.volume) * 100)} %`}
            className="barre-volume w-24"
            style={{ ["--p" as string]: `${(l.muet ? 0 : l.volume) * 100}%` }}
          />
        </div>

        {!direct ? (
          <button
            type="button"
            onClick={retourDirect}
            aria-label="Fermer l'épisode et revenir au direct"
            className="hover:bg-nuit-3 rounded p-2 sm:hidden"
          >
            <X className="size-5" aria-hidden />
          </button>
        ) : radioConfig.radiokingUrl ? (
          <a
            href={radioConfig.radiokingUrl}
            target="_blank"
            rel="noopener"
            className="text-nuit-encre-2 hover:text-nuit-encre hidden items-center gap-1.5 text-xs font-bold tracking-wider uppercase lg:inline-flex"
          >
            Ouvrir le player <ExternalLink className="size-3.5" aria-hidden />
          </a>
        ) : (
          <Link
            href="/emissions"
            className="text-nuit-encre-2 hover:text-nuit-encre hidden text-xs font-bold tracking-wider uppercase lg:inline"
          >
            Programmes
          </Link>
        )}
      </div>
    </div>
  )
}
