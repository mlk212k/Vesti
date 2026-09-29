const TZ = "Europe/Paris"

const fmtLong = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: TZ,
})
const fmtCourt = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", timeZone: TZ })
const fmtHeure = new Intl.DateTimeFormat("fr-FR", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: TZ,
})
const fmtJourSemaine = new Intl.DateTimeFormat("fr-FR", { weekday: "long", timeZone: TZ })
const fmtJourNum = new Intl.DateTimeFormat("fr-FR", { day: "2-digit", timeZone: TZ })
const fmtMoisCourt = new Intl.DateTimeFormat("fr-FR", { month: "short", timeZone: TZ })
const fmtCle = new Intl.DateTimeFormat("en-CA", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  timeZone: TZ,
})

export const dateLongue = (iso: string) => fmtLong.format(new Date(iso))
export const dateCourte = (iso: string) => fmtCourt.format(new Date(iso))
export const heure = (iso: string) => fmtHeure.format(new Date(iso)).replace(":", " h ")
export const jourSemaine = (iso: string) => fmtJourSemaine.format(new Date(iso))
export const jourNumero = (iso: string) => fmtJourNum.format(new Date(iso))
export const moisCourt = (iso: string) => fmtMoisCourt.format(new Date(iso)).replace(".", "")
/** Clé AAAA-MM-JJ dans le fuseau de la radio. */
export const cleJour = (d: Date) => fmtCle.format(d)

/** « Aujourd'hui », « Hier » ou la date courte — stable côté serveur. */
export function dateRelative(iso: string, maintenant = new Date()): string {
  const k = cleJour(new Date(iso))
  if (k === cleJour(maintenant)) return "Aujourd'hui"
  if (k === cleJour(new Date(maintenant.getTime() - 86_400_000))) return "Hier"
  return dateLongue(iso)
}

export function duree(secondes: number): string {
  const s = Math.max(0, Math.round(secondes))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const r = s % 60
  if (h > 0) return `${h} h ${String(m).padStart(2, "0")}`
  if (m > 0) return `${m} min`
  return `${r} s`
}

/** Durée ISO 8601 (schema.org). */
export function dureeIso(secondes: number): string {
  const h = Math.floor(secondes / 3600)
  const m = Math.floor((secondes % 3600) / 60)
  const s = Math.round(secondes % 60)
  return `PT${h ? `${h}H` : ""}${m ? `${m}M` : ""}${s || (!h && !m) ? `${s}S` : ""}`
}

export function chrono(secondes: number): string {
  if (!Number.isFinite(secondes)) return "--:--"
  const s = Math.max(0, Math.floor(secondes))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`
}
