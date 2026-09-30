import { site } from "@/config/site"
import { evenementParSlug } from "@/lib/contenu/evenements"

const ics = (d: string) =>
  new Date(d)
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "")
const echapper = (s: string) =>
  s
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/([,;])/g, "\\$1")

/** Fichier .ics pour ajouter l'événement à un agenda (Google, Apple, Outlook). */
export async function GET(_: Request, ctx: RouteContext<"/agenda/[slug]/ics">) {
  const { slug } = await ctx.params
  const e = await evenementParSlug(slug)
  if (!e) return new Response("Introuvable", { status: 404 })
  const fin = e.fin ?? new Date(new Date(e.debut).getTime() + 2 * 3600_000).toISOString()
  const corps = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Radio Tripoint//Agenda//FR",
    "BEGIN:VEVENT",
    `UID:${e.slug}@${new URL(site.url).host}`,
    `DTSTAMP:${ics(new Date().toISOString())}`,
    `DTSTART:${ics(e.debut)}`,
    `DTEND:${ics(fin)}`,
    `SUMMARY:${echapper(e.titre)}`,
    `DESCRIPTION:${echapper(e.description)}`,
    `LOCATION:${echapper([e.lieu, e.adresse, e.ville].filter(Boolean).join(", "))}`,
    `URL:${site.url}/agenda/${e.slug}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n")
  return new Response(corps, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${e.slug}.ics"`,
    },
  })
}
