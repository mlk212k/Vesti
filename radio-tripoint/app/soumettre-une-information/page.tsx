import { Lightbulb, Lock, Mic } from "lucide-react"
import Link from "next/link"
import {
  CaseConsentement,
  ChampChoix,
  ChampFichier,
  ChampTexte,
  ChampZone,
} from "@/components/forms/Champs"
import { Formulaire } from "@/components/forms/Formulaire"
import { PageHero } from "@/components/ui/PageHero"
import { categoriesInfo, PIECE_JOINTE } from "@/lib/formulaires/schemas"
import { metadataPage } from "@/lib/seo/metadata"

export const metadata = metadataPage({
  titre: "Soumettre une information à la rédaction",
  description:
    "Un événement, une initiative, une info locale ? Transmettez-la à la rédaction de Radio Tripoint, la radio des Trois Frontières.",
  chemin: "/soumettre-une-information",
})

const conseils = [
  {
    icone: Lightbulb,
    titre: "Soyez précis",
    texte:
      "Qui, quoi, où, quand : les faits d'abord. Une date et un lieu nous font gagner du temps.",
  },
  {
    icone: Mic,
    titre: "Tout le territoire",
    texte:
      "France, Luxembourg, Allemagne : toutes les infos des Trois Frontières nous intéressent.",
  },
  {
    icone: Lock,
    titre: "Vos données protégées",
    texte: "Vos coordonnées servent uniquement à vous recontacter. Elles ne sont jamais publiées.",
  },
]

export default function PageSoumettre() {
  return (
    <>
      <PageHero
        miettes={[{ nom: "Soumettre une information", chemin: "/soumettre-une-information" }]}
        surtitre="Participer"
        titre="Vous avez une information ?"
        intro="Un événement, une initiative, un talent, un problème à signaler : Radio Tripoint relaie ce qui se passe près de chez vous. Écrivez à la rédaction."
      />
      <div className="conteneur grid gap-12 py-12 lg:grid-cols-[1fr_1.8fr] lg:gap-16 lg:py-16">
        <aside>
          <ul className="space-y-7 lg:sticky lg:top-24">
            {conseils.map(({ icone: Icone, titre, texte }) => (
              <li key={titre} className="flex gap-4">
                <Icone
                  className="text-accent-encre mt-0.5 size-6 flex-none"
                  aria-hidden
                  strokeWidth={1.7}
                />
                <div>
                  <h2 className="titre-carte text-lg">{titre}</h2>
                  <p className="text-encre-2 mt-1">{texte}</p>
                </div>
              </li>
            ))}
          </ul>
        </aside>
        <Formulaire
          type="information"
          libelleEnvoi="Envoyer à la rédaction"
          succes={{
            titre: "Merci, c'est transmis !",
            texte: "La rédaction étudie votre information et vous recontacte si besoin.",
          }}
        >
          <fieldset>
            <legend className="surtitre text-encre-3 mb-5">Vous</legend>
            <div className="grid gap-5 sm:grid-cols-2">
              <ChampTexte name="nom" libelle="Nom" autoComplete="name" />
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
              <ChampTexte
                name="ville"
                libelle="Ville concernée"
                autoComplete="address-level2"
                placeholder="Sierck-les-Bains, Perl, Schengen…"
              />
            </div>
          </fieldset>
          <fieldset className="mt-10">
            <legend className="surtitre text-encre-3 mb-5">Votre information</legend>
            <div className="grid gap-5">
              <ChampChoix name="categorie" libelle="Catégorie" options={categoriesInfo} />
              <ChampTexte
                name="titre"
                libelle="Titre"
                placeholder="En une phrase, de quoi s'agit-il ?"
              />
              <ChampZone
                name="message"
                libelle="Message"
                rows={8}
                placeholder="Les faits, la date, le lieu, les personnes à contacter…"
              />
              <ChampFichier
                name="piece_jointe"
                libelle="Pièce jointe"
                aide={PIECE_JOINTE.libelle}
                accept={PIECE_JOINTE.types.join(",")}
              />
            </div>
          </fieldset>
          <CaseConsentement>
            J&apos;accepte que Radio Tripoint puisse me recontacter concernant cette information.{" "}
            <Link href="/politique-confidentialite" className="lien">
              Données personnelles
            </Link>
          </CaseConsentement>
        </Formulaire>
      </div>
    </>
  )
}
