import { CalendarPlus, Clock, ExternalLink, MapPin } from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"
import { EventCard } from "@/components/events/EventCard"
import { Breadcrumbs } from "@/components/ui/Breadcrumbs"
import { JsonLd } from "@/components/ui/JsonLd"
import { ShareButtons } from "@/components/ui/ShareButtons"
import { Visuel } from "@/components/ui/Visuel"
import { evenementParSlug, listerEvenements, tousEvenements } from "@/lib/contenu/evenements"
import { jsonLdEvenement } from "@/lib/seo/jsonld"
import { metadataPage, urlAbsolue } from "@/lib/seo/metadata"
import { dateLongue, heure, jourSemaine } from "@/lib/utils/dates"

const pays = { FR: "France", LU: "Luxembourg", DE: "Allemagne" } as const

export async function generateStaticParams() {
  return (await tousEvenements()).map((e) => ({ slug: e.slug }))
}

export async function generateMetadata(props: PageProps<"/agenda/[slug]">) {
  const { slug } = await props.params
  const e = await evenementParSlug(slug)
  if (!e) return { title: "Événement introuvable" }
  return metadataPage({
    titre: `${e.titre} — ${e.ville}, ${dateLongue(e.debut)}`,
    description: e.description,
    chemin: `/agenda/${e.slug}`,
    noindex: e.demo,
  })
}

export default async function PageEvenement(props: PageProps<"/agenda/[slug]">) {
  const { slug } = await props.params
  const e = await evenementParSlug(slug)
  if (!e) notFound()
  const autres = (await listerEvenements()).filter((x) => x.slug !== e.slug).slice(0, 4)
  const lieu = [e.lieu, e.adresse, e.ville].filter(Boolean).join(", ")
  const carte = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(lieu)}`

  return (
    <>
      <JsonLd data={jsonLdEvenement(e)} />
      <div className="conteneur pt-6 sm:pt-8">
        <Breadcrumbs
          elements={[
            { nom: "Agenda", chemin: "/agenda" },
            { nom: e.titre, chemin: `/agenda/${e.slug}` },
          ]}
        />
      </div>
      <article className="conteneur grid gap-10 pt-10 pb-16 lg:grid-cols-[1.4fr_1fr] lg:gap-16 lg:pt-14">
        <div>
          <p className="flex flex-wrap items-center gap-3">
            <span className="badge">
              {e.ville} · {pays[e.pays]}
            </span>
            {e.demo && <span className="badge-exemple">Exemple</span>}
          </p>
          <h1 className="titre-affiche mt-4 text-[clamp(2.1rem,1.2rem+3.4vw,4rem)] !leading-[1.02]">
            {e.titre}
          </h1>
          <div className="mt-8">
            <Visuel
              visuel={e.visuel}
              repli={{ mot: e.ville, surmot: "Agenda", teinte: "accent", taille: "grand" }}
              ratio="aspect-[16/9]"
              sizes="(min-width: 1024px) 55vw, 100vw"
              preload
            />
          </div>
          <p className="presse text-encre-2 mt-8 text-[1.2rem] leading-relaxed">{e.description}</p>
          <div className="border-trait mt-10 border-t pt-6">
            <ShareButtons url={urlAbsolue(`/agenda/${e.slug}`)} titre={e.titre} />
          </div>
        </div>
        <aside className="lg:pt-14">
          <div className="border-accent bg-surface border-t-4 p-6 lg:sticky lg:top-24">
            <p className="surtitre text-encre-3">{jourSemaine(e.debut)}</p>
            <p className="titre-affiche mt-1 text-[2.4rem]">{dateLongue(e.debut)}</p>
            <ul className="mt-6 space-y-4 text-[0.95rem]">
              <li className="flex gap-3">
                <Clock className="text-encre-3 mt-0.5 size-5 flex-none" aria-hidden />
                <span>
                  {heure(e.debut)}
                  {e.fin && <> – {heure(e.fin)}</>}
                </span>
              </li>
              <li className="flex gap-3">
                <MapPin className="text-encre-3 mt-0.5 size-5 flex-none" aria-hidden />
                <span>{lieu}</span>
              </li>
              {e.organisateur && <li className="text-encre-2">Organisé par {e.organisateur}</li>}
              {e.gratuit && <li className="text-succes font-semibold">Entrée libre</li>}
            </ul>
            <div className="mt-6 flex flex-col gap-2">
              <a href={`/agenda/${e.slug}/ics`} className="btn btn-plein">
                <CalendarPlus className="size-4" aria-hidden /> Ajouter à mon agenda
              </a>
              <a href={carte} target="_blank" rel="noopener" className="btn btn-trait">
                <MapPin className="size-4" aria-hidden /> Itinéraire
              </a>
              {e.lienExterne && (
                <a href={e.lienExterne} target="_blank" rel="noopener" className="btn btn-trait">
                  Site de l&apos;événement <ExternalLink className="size-4" aria-hidden />
                </a>
              )}
            </div>
          </div>
        </aside>
      </article>
      {autres.length > 0 && (
        <section aria-labelledby="titre-autres-ev" className="conteneur pb-20">
          <div className="filet-section flex flex-wrap items-end justify-between gap-4 pt-5">
            <h2 id="titre-autres-ev" className="titre-section">
              Aussi à l&apos;agenda
            </h2>
            <Link href="/agenda" className="lien-fleche hover:text-accent-encre">
              Tout l&apos;agenda
            </Link>
          </div>
          <ul className="mt-8 grid gap-x-10 gap-y-8 md:grid-cols-2">
            {autres.map((x) => (
              <li key={x.slug}>
                <EventCard evenement={x} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  )
}
