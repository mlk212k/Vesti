import { ACompleter, ProseLegale } from "@/components/ui/ProseLegale"
import { PageHero } from "@/components/ui/PageHero"
import { site } from "@/config/site"
import { metadataPage } from "@/lib/seo/metadata"

export const metadata = metadataPage({
  titre: "Mentions légales",
  description: "Mentions légales du site de Radio Tripoint.",
  chemin: "/mentions-legales",
})

export default function MentionsLegales() {
  const a = site.contact.adresse
  const l = site.legal
  return (
    <>
      <PageHero
        miettes={[{ nom: "Mentions légales", chemin: "/mentions-legales" }]}
        titre="Mentions légales"
      />
      <div className="conteneur py-12 lg:py-16">
        <ProseLegale>
          <h2>Éditeur du site</h2>
          <p>
            <strong>{site.nomOfficiel}</strong>
            <br />
            {a.lieu}, {a.rue}, {a.codePostal} {a.ville}, France
            <br />
            Téléphone : <a href={`tel:${site.contact.telephoneE164}`}>{site.contact.telephone}</a>
            <br />
            E-mail : <a href={`mailto:${site.contact.email}`}>{site.contact.email}</a>
          </p>
          <ul>
            <li>
              Forme juridique : <ACompleter valeur={l.formeJuridique} />
            </li>
            <li>
              SIRET : <ACompleter valeur={l.siret} />
            </li>
            <li>
              Directeur ou directrice de la publication :{" "}
              <ACompleter valeur={l.directeurPublication} />
            </li>
          </ul>
          <h2>Hébergement</h2>
          <p>
            {l.hebergeur.nom}, {l.hebergeur.adresse} —{" "}
            <a href={l.hebergeur.site}>{l.hebergeur.site.replace("https://", "")}</a>
          </p>
          <h2>Propriété intellectuelle</h2>
          <p>
            L&apos;ensemble des contenus de ce site (textes, émissions, podcasts, visuels, logo) est
            la propriété de {site.nomOfficiel} ou de ses auteurs, sauf mention contraire. Toute
            reproduction sans autorisation est interdite.
          </p>
          <h2>Liens externes</h2>
          <p>
            Les liens vers des sites tiers sont fournis à titre d&apos;information ; {site.nom}{" "}
            n&apos;est pas responsable de leur contenu.
          </p>
          <h2>Données personnelles</h2>
          <p>
            Voir la <a href="/politique-confidentialite">politique de confidentialité</a>.
          </p>
        </ProseLegale>
      </div>
    </>
  )
}
