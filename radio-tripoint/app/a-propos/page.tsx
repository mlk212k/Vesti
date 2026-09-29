import { ArrowRight } from "lucide-react"
import Link from "next/link"
import { BoutonDirect } from "@/components/radio/BoutonDirect"
import { SectionTerritoire } from "@/components/territoire/SectionTerritoire"
import { PageHero } from "@/components/ui/PageHero"
import { site } from "@/config/site"
import { metadataPage } from "@/lib/seo/metadata"

export const metadata = metadataPage({
  titre: "À propos — la radio des Trois Frontières",
  description:
    "Radio Tripoint, radio et média transfrontalier basé à Sierck-les-Bains : notre histoire, notre mission et notre territoire entre France, Luxembourg et Allemagne.",
  chemin: "/a-propos",
})

function Chapitre({ n, titre, children }: { n: string; titre: string; children: React.ReactNode }) {
  return (
    <section
      aria-labelledby={`ch-${n}`}
      className="border-trait-fort grid gap-6 border-t-2 pt-5 lg:grid-cols-[1fr_2fr] lg:gap-14"
    >
      <div className="flex items-baseline gap-4 lg:block">
        <span className="titre-affiche text-accent-encre text-[2.4rem] tabular-nums lg:text-[3.6rem]">
          {n}
        </span>
        <h2
          id={`ch-${n}`}
          className="titre-section !text-[clamp(1.7rem,1.2rem+1.8vw,2.6rem)] lg:mt-3"
        >
          {titre}
        </h2>
      </div>
      <div className="presse text-encre-2 space-y-5 text-[1.22rem] leading-relaxed">{children}</div>
    </section>
  )
}

export default function PageAPropos() {
  return (
    <>
      <PageHero
        miettes={[{ nom: "À propos", chemin: "/a-propos" }]}
        surtitre="Radio · Média · Territoire"
        titre={
          <>
            Une radio qui connecte
            <br className="hidden sm:block" /> les régions et les esprits.
          </>
        }
        intro="Radio Tripoint est la radio et le média des Trois Frontières. Depuis Sierck-les-Bains, elle parle à celles et ceux qui vivent, travaillent et sortent entre la France, le Luxembourg et l'Allemagne."
      />

      <div className="conteneur space-y-16 py-16 lg:space-y-24 lg:py-24">
        <Chapitre n="01" titre="Notre histoire">
          <p>
            Radio Tripoint est née à Sierck-les-Bains, au cœur du Sierckois, là où la Moselle fait
            frontière. Elle s&apos;est installée à l&apos;hôtel de ville, sur le quai des Ducs de
            Lorraine, avec une idée simple : donner au territoire des Trois Frontières une radio qui
            lui ressemble.
          </p>
          <p>
            Ce site accompagne une nouvelle étape : faire de Radio Tripoint un média complet, où
            l&apos;on écoute, où l&apos;on lit, et où l&apos;on participe.
          </p>
        </Chapitre>

        <Chapitre n="02" titre="Notre mission">
          <p>
            Informer, divertir et relier. Radio Tripoint diffuse des programmes et des contenus de
            qualité, relaie l&apos;actualité locale, la culture, le sport et les messages de
            prévention, et donne la parole aux habitants.
          </p>
          <p>
            Elle accompagne aussi les acteurs économiques du territoire : vente d&apos;espaces
            publicitaires, conception de campagnes marketing et promotion de sites internet, avec la
            même exigence de qualité et de service.
          </p>
        </Chapitre>

        <Chapitre n="03" titre="Notre territoire">
          <p>
            Sierck-les-Bains, Apach, Schengen, Perl, la Moselle, le Luxembourg, la Sarre : un même
            bassin de vie, trois pays, et des trajets quotidiens d&apos;une rive à l&apos;autre.
            C&apos;est ce territoire que Radio Tripoint raconte.
          </p>
        </Chapitre>

        <Chapitre n="04" titre="Notre vision">
          <p>
            Une radio de proximité qui ne s&apos;arrête pas aux frontières. Radio, site, podcasts,
            agenda, réseaux : un seul média pour suivre ce qui se passe près de chez soi, quel que
            soit le côté de la Moselle.
          </p>
        </Chapitre>

        <Chapitre n="05" titre="Notre équipe">
          <p>
            La présentation de l&apos;équipe de Radio Tripoint — les voix de l&apos;antenne et
            celles et ceux qui la font vivre — sera publiée prochainement sur cette page.
          </p>
          <p className="font-sans text-base">
            Envie de participer, de proposer une émission ou de rejoindre l&apos;aventure ?{" "}
            <Link href="/contact" className="lien text-encre font-semibold">
              Écrivez-nous
            </Link>
            .
          </p>
        </Chapitre>
      </div>

      <SectionTerritoire />

      <section aria-labelledby="titre-trois" className="conteneur py-16 lg:py-24">
        <h2 id="titre-trois" className="sr-only">
          Radio, média, territoire
        </h2>
        <ul className="border-trait bg-trait grid gap-px border md:grid-cols-3">
          {[
            {
              t: "Radio",
              x: "Le direct, les émissions, les voix du territoire.",
              href: "/emissions",
              l: "Nos émissions",
            },
            {
              t: "Média",
              x: "Actualités, podcasts, agenda : l'info locale au quotidien.",
              href: "/actualites",
              l: "Les actualités",
            },
            {
              t: "Territoire",
              x: "Trois pays, un bassin de vie, une antenne commune.",
              href: "/agenda",
              l: "L'agenda",
            },
          ].map((b) => (
            <li key={b.t} className="bg-papier p-7 sm:p-9">
              <p className="titre-affiche text-[2.6rem]">{b.t}</p>
              <p className="text-encre-2 mt-3">{b.x}</p>
              <Link href={b.href} className="lien-fleche hover:text-accent-encre mt-6">
                {b.l} <ArrowRight className="size-4" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
        <div className="mt-12 flex flex-wrap items-center gap-4">
          <BoutonDirect taille="grand" />
          <p className="text-encre-3 text-sm">
            {site.nomOfficiel} · {site.contact.adresse.lieu}, {site.contact.adresse.ville}
          </p>
        </div>
      </section>
    </>
  )
}
