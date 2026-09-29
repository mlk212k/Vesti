import { BoutonGererCookies } from "@/components/rgpd/Consentement"
import { ProseLegale } from "@/components/ui/ProseLegale"
import { PageHero } from "@/components/ui/PageHero"
import { analytics } from "@/config/analytics"
import { site } from "@/config/site"
import { metadataPage } from "@/lib/seo/metadata"

export const metadata = metadataPage({
  titre: "Politique de confidentialité et cookies",
  description:
    "Comment Radio Tripoint traite vos données personnelles et utilise (ou non) les cookies.",
  chemin: "/politique-confidentialite",
})

export default function Confidentialite() {
  return (
    <>
      <PageHero
        miettes={[{ nom: "Politique de confidentialité", chemin: "/politique-confidentialite" }]}
        titre="Confidentialité & cookies"
        intro="Ce que nous collectons, pourquoi, et comment exercer vos droits."
      />
      <div className="conteneur py-12 lg:py-16">
        <ProseLegale>
          <h2>Responsable du traitement</h2>
          <p>
            {site.nomOfficiel}, {site.contact.adresse.lieu}, {site.contact.adresse.rue},{" "}
            {site.contact.adresse.codePostal} {site.contact.adresse.ville}. Contact :{" "}
            <a href={`mailto:${site.contact.email}`}>{site.contact.email}</a>.
          </p>
          <h2>Données collectées</h2>
          <p>
            Le site ne collecte des données personnelles que lorsque vous les transmettez
            volontairement :
          </p>
          <ul>
            <li>formulaire de contact : nom, e-mail, téléphone (facultatif), message ;</li>
            <li>
              soumission d&apos;information : nom, e-mail, téléphone (facultatif), ville, message et
              pièce jointe éventuelle ;
            </li>
            <li>
              demande d&apos;offre publicitaire : nom, entreprise, e-mail, téléphone (facultatif),
              besoin ;
            </li>
            <li>newsletter : adresse e-mail.</li>
          </ul>
          <h2>Finalités et base légale</h2>
          <p>
            Ces données servent uniquement à répondre à votre demande, à traiter l&apos;information
            transmise ou à vous envoyer la newsletter. Le traitement repose sur votre consentement,
            recueilli par la case à cocher de chaque formulaire. Elles ne sont ni vendues, ni
            cédées, et ne sont jamais publiées sans votre accord.
          </p>
          <h2>Durée de conservation</h2>
          <p>
            Les données sont conservées le temps nécessaire au traitement de votre demande, puis
            supprimées. Les inscriptions à la newsletter sont conservées jusqu&apos;à votre
            désinscription.
          </p>
          <h2>Vos droits</h2>
          <p>
            Vous disposez d&apos;un droit d&apos;accès, de rectification, d&apos;effacement,
            d&apos;opposition et de retrait de votre consentement. Écrivez à{" "}
            <a href={`mailto:${site.contact.email}`}>{site.contact.email}</a>. En cas de difficulté,
            vous pouvez saisir la CNIL (<a href="https://www.cnil.fr">cnil.fr</a>).
          </p>
          <h2 id="cookies">Cookies</h2>
          {analytics.script ? (
            <p>
              Avec votre accord, le site utilise {analytics.nom} pour mesurer son audience. Sans
              accord, aucun traceur n&apos;est chargé.
            </p>
          ) : (
            <p>
              <strong>
                Ce site ne dépose aucun cookie publicitaire ni de mesure d&apos;audience.
              </strong>{" "}
              Il n&apos;utilise que le stockage local de votre navigateur pour deux préférences de
              confort, qui ne quittent pas votre appareil : le thème clair ou sombre, et le volume
              du lecteur.
            </p>
          )}
          <p>
            L&apos;écoute du direct et des podcasts fait appel au serveur de diffusion audio de la
            radio, qui reçoit, comme tout serveur web, votre adresse IP le temps de la lecture. Les
            liens de partage (Facebook, X, WhatsApp) ne chargent rien tant que vous ne cliquez pas.
          </p>
          <BoutonGererCookies />
        </ProseLegale>
      </div>
    </>
  )
}
