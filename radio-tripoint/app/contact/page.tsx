import { Mail, MapPin, Navigation, Phone } from "lucide-react"
import Link from "next/link"
import { CaseConsentement, ChampTexte, ChampZone } from "@/components/forms/Champs"
import { Formulaire } from "@/components/forms/Formulaire"
import { IconeReseau } from "@/components/marque/IconesReseaux"
import { PageHero } from "@/components/ui/PageHero"
import { site } from "@/config/site"
import { reseauxActifs } from "@/config/socialLinks"
import { metadataPage } from "@/lib/seo/metadata"

export const metadata = metadataPage({
  titre: "Contact — Radio Tripoint, Sierck-les-Bains",
  description: `Contactez Radio Tripoint : ${site.contact.telephone}, ${site.contact.email}. Hôtel de ville, 12 Quai des Ducs de Lorraine, 57480 Sierck-les-Bains.`,
  chemin: "/contact",
})

export default function PageContact() {
  const a = site.contact.adresse
  const reseaux = reseauxActifs()
  const cartes = [
    {
      icone: Phone,
      titre: "Téléphone",
      valeur: site.contact.telephone,
      href: `tel:${site.contact.telephoneE164}`,
      cta: "Appeler",
    },
    {
      icone: Mail,
      titre: "E-mail",
      valeur: site.contact.email,
      href: `mailto:${site.contact.email}`,
      cta: "Envoyer un e-mail",
    },
    {
      icone: MapPin,
      titre: "Adresse",
      valeur: `${a.lieu}, ${a.rue}, ${a.codePostal} ${a.ville}`,
      href: site.contact.itineraire,
      cta: "Itinéraire",
      externe: true,
    },
  ]
  return (
    <>
      <PageHero
        miettes={[{ nom: "Contact", chemin: "/contact" }]}
        surtitre="Nous joindre"
        titre="Contact"
        intro="Une question, une idée d'émission, une demande de partenariat ? L'équipe de Radio Tripoint vous répond."
      />
      <section aria-label="Coordonnées" className="conteneur py-12 lg:py-16">
        <h2 className="sr-only">{site.nomOfficiel}</h2>
        <ul className="border-trait bg-trait grid gap-px border md:grid-cols-3">
          {cartes.map(({ icone: Icone, titre, valeur, href, cta, externe }) => (
            <li key={titre} className="bg-surface flex flex-col p-6 sm:p-8">
              <Icone className="text-accent-encre size-6" aria-hidden strokeWidth={1.7} />
              <p className="surtitre text-encre-3 mt-5">{titre}</p>
              {titre === "Adresse" ? (
                <address className="titre-carte mt-2 text-[1.15rem] not-italic">
                  {site.nomOfficiel}
                  <br />
                  {a.lieu}
                  <br />
                  {a.rue}
                  <br />
                  {a.codePostal} {a.ville}
                </address>
              ) : (
                <p className="titre-carte mt-2 text-[1.2rem] break-all">{valeur}</p>
              )}
              <a
                href={href}
                {...(externe ? { target: "_blank", rel: "noopener" } : {})}
                className="btn btn-plein mt-6 self-start"
              >
                {titre === "Adresse" && <Navigation className="size-4" aria-hidden />}
                {cta}
              </a>
            </li>
          ))}
        </ul>
        {reseaux.length > 0 && (
          <ul className="mt-6 flex flex-wrap gap-2" aria-label="Réseaux sociaux">
            {reseaux.map((r) => (
              <li key={r.reseau}>
                <a href={r.url} target="_blank" rel="noopener" className="btn btn-trait">
                  <IconeReseau reseau={r.reseau} className="size-4" /> {r.libelle}
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="titre-ecrire" className="conteneur pb-20">
        <div className="filet-section grid gap-12 pt-8 lg:grid-cols-[1fr_1.6fr]">
          <div>
            <h2 id="titre-ecrire" className="titre-section">
              Nous écrire
            </h2>
            <p className="presse text-encre-2 mt-4 text-lg leading-snug">
              Vous avez une information à nous transmettre ? Utilisez plutôt{" "}
              <Link href="/soumettre-une-information" className="lien text-encre">
                le formulaire dédié
              </Link>
              . Annonceur ?{" "}
              <Link href="/publicite#demande" className="lien text-encre">
                Demandez une offre
              </Link>
              .
            </p>
          </div>
          <Formulaire
            type="contact"
            libelleEnvoi="Envoyer le message"
            succes={{
              titre: "Message envoyé.",
              texte: "Merci ! L'équipe de Radio Tripoint vous répond dès que possible.",
            }}
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <ChampTexte name="nom" libelle="Nom et prénom" autoComplete="name" />
              <ChampTexte
                name="email"
                type="email"
                libelle="E-mail"
                autoComplete="email"
                inputMode="email"
              />
              <ChampTexte
                name="telephone"
                type="tel"
                libelle="Téléphone"
                autoComplete="tel"
                inputMode="tel"
                facultatif
              />
              <ChampTexte name="sujet" libelle="Sujet" facultatif />
              <ChampZone name="message" libelle="Message" className="sm:col-span-2" />
            </div>
            <CaseConsentement>
              J&apos;accepte que Radio Tripoint utilise ces informations pour répondre à mon
              message.{" "}
              <Link href="/politique-confidentialite" className="lien">
                En savoir plus
              </Link>
            </CaseConsentement>
          </Formulaire>
        </div>
      </section>
    </>
  )
}
