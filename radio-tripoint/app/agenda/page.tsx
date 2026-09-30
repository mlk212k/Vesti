import Link from "next/link"
import { EventCard } from "@/components/events/EventCard"
import { EtatVide } from "@/components/ui/EtatVide"
import { Filtres } from "@/components/ui/Filtres"
import { PageHero } from "@/components/ui/PageHero"
import { listerEvenements, villesAgenda, type Periode } from "@/lib/contenu/evenements"
import { metadataPage } from "@/lib/seo/metadata"

export const metadata = metadataPage({
  titre: "Agenda des Trois Frontières — sorties et événements",
  description:
    "Concerts, fêtes, expositions, sport : l'agenda des événements à Sierck-les-Bains, Apach, Perl, Schengen et dans toute la région des Trois Frontières.",
  chemin: "/agenda",
})

const periodes: { valeur: Periode; libelle: string }[] = [
  { valeur: "tout", libelle: "À venir" },
  { valeur: "aujourdhui", libelle: "Aujourd'hui" },
  { valeur: "semaine", libelle: "Cette semaine" },
  { valeur: "mois", libelle: "Ce mois-ci" },
]

export default async function PageAgenda(props: PageProps<"/agenda">) {
  const sp = await props.searchParams
  const periode = (periodes.find((p) => p.valeur === sp.quand)?.valeur ?? "tout") as Periode
  const villes = await villesAgenda()
  const ville = typeof sp.ville === "string" && villes.includes(sp.ville) ? sp.ville : undefined
  const [evenements, tous] = await Promise.all([
    listerEvenements({ periode, ville }),
    listerEvenements(),
  ])

  const href = (quand: string, v?: string) => {
    const p = new URLSearchParams()
    if (quand !== "tout") p.set("quand", quand)
    if (v) p.set("ville", v)
    const s = p.toString()
    return s ? `/agenda?${s}` : "/agenda"
  }

  // Regroupement par mois pour le rythme de lecture.
  const parMois = new Map<string, typeof evenements>()
  for (const e of evenements) {
    const k = new Intl.DateTimeFormat("fr-FR", {
      month: "long",
      year: "numeric",
      timeZone: "Europe/Paris",
    }).format(new Date(e.debut))
    parMois.set(k, [...(parMois.get(k) ?? []), e])
  }

  return (
    <>
      <PageHero
        miettes={[{ nom: "Agenda", chemin: "/agenda" }]}
        surtitre="Sortir"
        titre="L'agenda des Trois Frontières"
        intro="Concerts, fêtes, expositions, rencontres sportives : les rendez-vous du territoire, d'un côté comme de l'autre de la frontière."
        enfants={
          tous.length > 0 && (
            <div className="mt-8 space-y-3">
              <Filtres
                label="Période"
                options={periodes}
                actif={periode}
                href={(v) => href(v, ville)}
              />
              {villes.length > 1 && (
                <Filtres
                  label="Ville"
                  options={[
                    { valeur: "", libelle: "Toutes les villes" },
                    ...villes.map((v) => ({ valeur: v, libelle: v })),
                  ]}
                  actif={ville ?? ""}
                  href={(v) => href(periode, v || undefined)}
                />
              )}
            </div>
          )
        }
      />
      <section aria-label="Événements" className="conteneur py-12 lg:py-16">
        {tous.length === 0 ? (
          <EtatVide
            titre="Aucun événement annoncé pour le moment."
            actions={
              <Link href="/soumettre-une-information" className="btn btn-plein">
                Annoncer un événement
              </Link>
            }
          >
            Associations, communes, organisateurs : envoyez-nous vos rendez-vous, Radio Tripoint les
            relaie à l&apos;antenne et sur cette page.
          </EtatVide>
        ) : evenements.length === 0 ? (
          <EtatVide
            titre="Rien de prévu sur cette période."
            actions={
              <Link href="/agenda" className="btn btn-trait">
                Voir tout l&apos;agenda
              </Link>
            }
          >
            Élargissez la période ou changez de ville.
          </EtatVide>
        ) : (
          <div className="space-y-14">
            {[...parMois.entries()].map(([mois, liste]) => (
              <section key={mois} aria-labelledby={`mois-${mois}`}>
                <h2 id={`mois-${mois}`} className="titre-section capitalize">
                  {mois}
                </h2>
                <ul className="mt-6 grid gap-x-10 gap-y-8 md:grid-cols-2">
                  {liste.map((e) => (
                    <li key={e.slug}>
                      <EventCard evenement={e} />
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </section>
    </>
  )
}
