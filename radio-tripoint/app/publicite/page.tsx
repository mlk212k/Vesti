import { ArrowDown, Globe, Megaphone, Phone, Radio, Sparkles, Ticket } from "lucide-react"
import { FormulairePublicite } from "@/components/forms/FormulairePublicite"
import { Tripoint } from "@/components/marque/Tripoint"
import { Breadcrumbs } from "@/components/ui/Breadcrumbs"
import { site } from "@/config/site"
import { metadataPage } from "@/lib/seo/metadata"

export const metadata = metadataPage({
  titre: "Publicité radio et web dans les Trois Frontières",
  description:
    "Faites connaître votre entreprise sur Radio Tripoint : publicité radio, campagnes locales, promotion web et événementielle entre Moselle, Luxembourg et Sarre.",
  chemin: "/publicite",
})

const solutions = [
  {
    icone: Radio,
    titre: "Publicité radio",
    texte:
      "Des spots diffusés sur l'antenne de Radio Tripoint, pour une présence régulière auprès des auditeurs du territoire.",
  },
  {
    icone: Megaphone,
    titre: "Campagnes locales",
    texte:
      "Un message pensé pour votre zone de chalandise, de Sierck-les-Bains à la Grande Région, construit et suivi avec notre équipe.",
  },
  {
    icone: Globe,
    titre: "Promotion web",
    texte:
      "La mise en avant de votre activité et de votre site internet sur les supports numériques de Radio Tripoint.",
  },
  {
    icone: Ticket,
    titre: "Campagnes événementielles",
    texte:
      "Un lancement, une ouverture, une fête, un salon : un dispositif radio et web autour de votre date.",
  },
  {
    icone: Sparkles,
    titre: "Visibilité digitale",
    texte:
      "Présence sur le site et les réseaux de la radio, en complément de l'antenne, pour prolonger votre message.",
  },
]

const etapes = [
  {
    titre: "Vous nous parlez de votre projet",
    texte: "Votre activité, votre objectif, votre calendrier, votre zone.",
  },
  {
    titre: "Nous construisons une proposition",
    texte: "Un dispositif sur mesure : antenne, web, ou les deux.",
  },
  {
    titre: "Votre message est diffusé",
    texte: "Conception, diffusion et suivi, avec un interlocuteur unique.",
  },
]

export default function PagePublicite() {
  return (
    <>
      <header className="bg-accent text-sur-accent relative isolate overflow-hidden">
        <Tripoint
          className="pointer-events-none absolute top-1/2 left-[80%] -z-10 h-[160%] w-auto -translate-x-1/2 -translate-y-1/2 text-white/25"
          epaisseur={1}
        />
        <div className="conteneur pt-6 pb-14 sm:pt-8 lg:pb-24">
          <Breadcrumbs
            sombre
            elements={[{ nom: "Publicité", chemin: "/publicite" }]}
            className="[&_*]:!text-white/80"
          />
          <p className="surtitre mt-10 opacity-80">Professionnels · Annonceurs · Partenaires</p>
          <h1 className="titre-affiche mt-4 text-[clamp(2.8rem,1.4rem+6.4vw,7rem)]">
            Votre entreprise.
            <br />
            Notre audience.
          </h1>
          <p className="presse mt-6 max-w-2xl text-[1.3rem] leading-snug opacity-90 sm:text-[1.45rem]">
            Radio Tripoint diffuse ses programmes, vend des espaces publicitaires et conçoit des
            campagnes marketing pour les entreprises des Trois Frontières — avec l&apos;exigence
            d&apos;un service soigné, du premier échange à la diffusion.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <a
              href={`tel:${site.contact.telephoneE164}`}
              className="btn bg-sur-accent text-accent min-h-14 !px-6 hover:bg-white"
            >
              <Phone className="size-4" aria-hidden /> Parler à notre équipe
            </a>
            <a
              href="#demande"
              className="btn min-h-14 border-[1.5px] border-current !px-6 hover:bg-white/10"
            >
              Demander une offre <ArrowDown className="size-4" aria-hidden />
            </a>
          </div>
        </div>
      </header>

      <section aria-labelledby="titre-solutions" className="conteneur py-16 lg:py-24">
        <div className="grid gap-10 lg:grid-cols-[1fr_2fr]">
          <div>
            <p className="surtitre text-accent-encre">Nos solutions</p>
            <h2 id="titre-solutions" className="titre-section mt-2">
              Se faire entendre, des deux côtés de la frontière.
            </h2>
          </div>
          <ul className="border-trait bg-trait grid gap-px border sm:grid-cols-2">
            {solutions.map(({ icone: Icone, titre, texte }, i) => (
              <li key={titre} className={`bg-papier p-6 sm:p-8 ${i === 0 ? "sm:col-span-2" : ""}`}>
                <Icone className="text-accent-encre size-7" aria-hidden strokeWidth={1.6} />
                <h3 className="titre-carte mt-5 text-[1.35rem]">{titre}</h3>
                <p className="text-encre-2 mt-2">{texte}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section aria-labelledby="titre-pourquoi" className="bg-nuit text-nuit-encre">
        <div className="conteneur grid gap-12 py-16 lg:grid-cols-2 lg:py-24">
          <div>
            <p className="surtitre text-nuit-accent">Pourquoi Radio Tripoint</p>
            <h2 id="titre-pourquoi" className="titre-section mt-2">
              Un média ancré dans un territoire unique.
            </h2>
          </div>
          <ul className="space-y-8">
            {[
              [
                "Transfrontalier par nature",
                "Basée à Sierck-les-Bains, à quelques kilomètres du tripoint de Schengen, la radio s'adresse à un bassin de vie partagé entre la France, le Luxembourg et l'Allemagne.",
              ],
              [
                "Radio et web",
                "L'antenne, le site et les réseaux : votre message peut vivre sur plusieurs supports, dans une même campagne.",
              ],
              [
                "Un accompagnement de proximité",
                "Un interlocuteur qui connaît le territoire, attentif aux détails de votre projet.",
              ],
            ].map(([t, x]) => (
              <li key={t} className="border-nuit-trait border-t pt-5">
                <h3 className="titre-carte text-xl">{t}</h3>
                <p className="text-nuit-encre-2 mt-2">{x}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section aria-labelledby="titre-etapes" className="conteneur py-16 lg:py-24">
        <p className="surtitre text-accent-encre">Comment ça marche</p>
        <h2 id="titre-etapes" className="titre-section mt-2">
          Trois étapes, un interlocuteur.
        </h2>
        <ol className="mt-10 grid gap-8 md:grid-cols-3">
          {etapes.map((e, i) => (
            <li key={e.titre} className="border-trait-fort border-t-2 pt-5">
              <span className="titre-affiche text-accent-encre text-[3rem] tabular-nums">
                0{i + 1}
              </span>
              <h3 className="titre-carte mt-3 text-xl">{e.titre}</h3>
              <p className="text-encre-2 mt-2">{e.texte}</p>
            </li>
          ))}
        </ol>
      </section>

      <section
        id="partenariats"
        aria-labelledby="titre-partenariats"
        className="border-trait bg-papier-2 scroll-mt-24 border-y"
      >
        <div className="conteneur grid gap-8 py-14 lg:grid-cols-[1fr_1.4fr] lg:items-center lg:py-20">
          <h2 id="titre-partenariats" className="titre-section">
            Partenariats
          </h2>
          <p className="presse text-encre-2 text-[1.25rem] leading-snug">
            Collectivité, association, organisateur d&apos;événement, média : Radio Tripoint est
            ouverte aux partenariats qui font vivre le territoire. Présentez-nous votre projet via
            le formulaire ci-dessous en choisissant « Partenariat ».
          </p>
        </div>
      </section>

      <section
        id="demande"
        aria-labelledby="titre-demande"
        className="conteneur scroll-mt-24 py-16 lg:py-24"
      >
        <div className="grid gap-12 lg:grid-cols-[1fr_1.5fr]">
          <div>
            <p className="surtitre text-accent-encre">Demander une offre</p>
            <h2 id="titre-demande" className="titre-section mt-2">
              Parlons de votre projet.
            </h2>
            <p className="presse text-encre-2 mt-4 text-lg leading-snug">
              Réponse personnalisée, sans engagement.
            </p>
            <div className="mt-8 space-y-2 text-[0.95rem]">
              <p>
                <a href={`tel:${site.contact.telephoneE164}`} className="lien font-semibold">
                  {site.contact.telephone}
                </a>
              </p>
              <p>
                <a href={`mailto:${site.contact.email}`} className="lien break-all">
                  {site.contact.email}
                </a>
              </p>
            </div>
          </div>
          <FormulairePublicite />
        </div>
      </section>
    </>
  )
}
