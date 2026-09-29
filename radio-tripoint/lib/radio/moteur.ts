/**
 * Moteur audio unique du site.
 *
 * Un seul <audio> pour le direct ET les podcasts : lancer un épisode coupe
 * le direct et inversement, comme sur un vrai poste. Il vit hors de React
 * (état externe + useSyncExternalStore) pour survivre aux navigations et
 * ne jamais déclencher de setState dans un effet.
 *
 * Il ne doit jamais faire planter la page : toute erreur de flux devient
 * l'état `error` avec une raison lisible.
 */
import { radioConfig } from "@/config/radioConfig"

export type Statut = "idle" | "loading" | "playing" | "paused" | "error"
export type RaisonErreur = "non-configure" | "reseau" | "lecture" | "bloque"

export interface EpisodeEnLecture {
  slug: string
  titre: string
  audioUrl: string
  sousTitre?: string
  duree?: number
}

export interface TitreEnCours {
  titre: string
  artiste?: string
  pochette?: string
}

export interface EtatLecteur {
  source: "direct" | "episode"
  episode: EpisodeEnLecture | null
  statut: Statut
  erreur: RaisonErreur | null
  volume: number
  muet: boolean
  position: number
  dureeMedia: number
  titreEnCours: TitreEnCours | null
}

const CLE_VOLUME = "rt:volume"

const ETAT_INITIAL: EtatLecteur = {
  source: "direct",
  episode: null,
  statut: "idle",
  erreur: null,
  volume: 0.9,
  muet: false,
  position: 0,
  dureeMedia: 0,
  titreEnCours: null,
}

let etat: EtatLecteur = ETAT_INITIAL
const abonnes = new Set<() => void>()
let audio: HTMLAudioElement | null = null
let minuterieSuivi: ReturnType<typeof setInterval> | null = null
let suiveurs = 0

function maj(partiel: Partial<EtatLecteur>) {
  etat = { ...etat, ...partiel }
  abonnes.forEach((f) => f())
}

export function abonner(f: () => void) {
  abonnes.add(f)
  return () => abonnes.delete(f)
}
export const lire = () => etat
export const lireServeur = () => ETAT_INITIAL

function lireVolumeSauve(): number | null {
  try {
    const v = Number(localStorage.getItem(CLE_VOLUME))
    return Number.isFinite(v) && v > 0 && v <= 1 ? v : null
  } catch {
    return null
  }
}

function element(): HTMLAudioElement {
  if (audio) return audio
  audio = new Audio()
  audio.preload = "none"
  const sauve = lireVolumeSauve()
  if (sauve !== null) {
    audio.volume = sauve
    etat = { ...etat, volume: sauve }
  } else {
    audio.volume = etat.volume
  }

  audio.addEventListener("playing", () => maj({ statut: "playing", erreur: null }))
  audio.addEventListener("waiting", () => maj({ statut: "loading" }))
  audio.addEventListener("pause", () => {
    if (etat.statut !== "error") maj({ statut: etat.statut === "idle" ? "idle" : "paused" })
  })
  audio.addEventListener("ended", () => maj({ statut: "paused", position: 0 }))
  audio.addEventListener("timeupdate", () => {
    if (etat.source === "episode" && audio) maj({ position: audio.currentTime })
  })
  audio.addEventListener("loadedmetadata", () => {
    if (etat.source === "episode" && audio && Number.isFinite(audio.duration))
      maj({ dureeMedia: audio.duration })
  })
  audio.addEventListener("error", () => {
    // Un src vidé volontairement (arrêt du direct) déclenche aussi `error`.
    if (!audio?.getAttribute("src")) return
    maj({ statut: "error", erreur: navigator.onLine === false ? "reseau" : "lecture" })
  })
  return audio
}

function metadonneesSysteme() {
  if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return
  const titre =
    etat.source === "episode"
      ? (etat.episode?.titre ?? radioConfig.radioName)
      : (etat.titreEnCours?.titre ?? `${radioConfig.radioName} — en direct`)
  const artiste =
    etat.source === "episode"
      ? (etat.episode?.sousTitre ?? radioConfig.radioName)
      : (etat.titreEnCours?.artiste ?? radioConfig.radioName)
  try {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: titre,
      artist: artiste,
      album: radioConfig.radioName,
      artwork: [{ src: "/icon-512.png", sizes: "512x512", type: "image/png" }],
    })
    navigator.mediaSession.setActionHandler("play", () => void reprendre())
    navigator.mediaSession.setActionHandler("pause", () => pause())
    navigator.mediaSession.setActionHandler("stop", () => pause())
  } catch {
    /* API partielle selon les navigateurs : sans conséquence. */
  }
}

async function demarrer(src: string) {
  const a = element()
  maj({ statut: "loading", erreur: null })
  a.src = src
  try {
    await a.play()
    metadonneesSysteme()
  } catch (e) {
    const nom = (e as DOMException)?.name
    // AbortError = une autre lecture a été demandée entre-temps : normal.
    if (nom === "AbortError") return
    maj({
      statut: "error",
      erreur:
        nom === "NotAllowedError" ? "bloque" : navigator.onLine === false ? "reseau" : "lecture",
    })
  }
}

/** Lance le direct. */
export async function ecouterDirect() {
  if (!radioConfig.streamUrl) {
    maj({ source: "direct", episode: null, statut: "error", erreur: "non-configure" })
    return
  }
  maj({ source: "direct", episode: null, position: 0, dureeMedia: 0 })
  // Paramètre anti-cache : on repart toujours du direct, pas d'un tampon périmé.
  const sep = radioConfig.streamUrl.includes("?") ? "&" : "?"
  await demarrer(`${radioConfig.streamUrl}${sep}t=${Date.now()}`)
}

/** Lance un épisode (podcast / replay). */
export async function ecouterEpisode(ep: EpisodeEnLecture) {
  if (etat.source === "episode" && etat.episode?.slug === ep.slug && audio?.getAttribute("src")) {
    return reprendre()
  }
  maj({ source: "episode", episode: ep, position: 0, dureeMedia: ep.duree ?? 0 })
  await demarrer(ep.audioUrl)
}

export function pause() {
  if (!audio) return
  audio.pause()
  if (etat.source === "direct") {
    // Couper vraiment le flux : un direct en pause consomme de la donnée
    // et reprendrait en retard.
    audio.removeAttribute("src")
    audio.load()
    maj({ statut: "paused" })
  }
}

export async function reprendre() {
  if (etat.source === "direct") return ecouterDirect()
  if (!audio?.getAttribute("src") && etat.episode) return demarrer(etat.episode.audioUrl)
  if (!audio) return
  try {
    maj({ statut: "loading" })
    await audio.play()
  } catch {
    maj({ statut: "error", erreur: "lecture" })
  }
}

/** Bouton lecture/pause générique : agit sur la source courante. */
export function basculer() {
  if (etat.statut === "playing" || etat.statut === "loading") pause()
  else void reprendre()
}

/** Bouton « direct » : lance le direct, ou le coupe s'il joue déjà. */
export function basculerDirect() {
  if (etat.source === "direct" && (etat.statut === "playing" || etat.statut === "loading")) pause()
  else void ecouterDirect()
}

export function retourDirect() {
  if (audio) {
    audio.pause()
    audio.removeAttribute("src")
    audio.load()
  }
  maj({ source: "direct", episode: null, statut: "idle", erreur: null, position: 0, dureeMedia: 0 })
}

export function reglerVolume(v: number) {
  const volume = Math.min(1, Math.max(0, v))
  element().volume = volume
  element().muted = volume === 0
  maj({ volume, muet: volume === 0 })
  try {
    if (volume > 0) localStorage.setItem(CLE_VOLUME, String(volume))
  } catch {
    /* stockage indisponible (navigation privée) : sans conséquence */
  }
}

export function basculerMuet() {
  const a = element()
  a.muted = !a.muted
  maj({ muet: a.muted })
}

export function chercher(secondes: number) {
  if (!audio || etat.source !== "episode") return
  audio.currentTime = Math.max(0, Math.min(secondes, audio.duration || secondes))
  maj({ position: audio.currentTime })
}

export function effacerErreur() {
  maj({ erreur: null, statut: "idle" })
}

/* ─── Titre en cours ─────────────────────────────────────────────────── */

async function rafraichirTitre() {
  if (document.visibilityState !== "visible") return
  try {
    const r = await fetch(radioConfig.nowPlayingEndpoint, { cache: "no-store" })
    if (!r.ok) return
    const d = (await r.json()) as { titre?: TitreEnCours | null }
    const t = d.titre ?? null
    if (JSON.stringify(t) !== JSON.stringify(etat.titreEnCours)) {
      maj({ titreEnCours: t })
      if (etat.source === "direct" && etat.statut === "playing") metadonneesSysteme()
    }
  } catch {
    /* le titre en cours est un bonus : son absence ne doit rien casser */
  }
}

/** Appelé par les composants qui affichent le titre en cours. */
export function suivreTitre(): () => void {
  suiveurs++
  if (suiveurs === 1) {
    void rafraichirTitre()
    minuterieSuivi = setInterval(rafraichirTitre, radioConfig.nowPlayingRefreshMs)
  }
  return () => {
    suiveurs--
    if (suiveurs === 0 && minuterieSuivi) {
      clearInterval(minuterieSuivi)
      minuterieSuivi = null
    }
  }
}
