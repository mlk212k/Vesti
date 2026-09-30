import Link from "next/link"
import { besoinsPub } from "@/lib/formulaires/schemas"
import { CaseConsentement, ChampChoix, ChampTexte, ChampZone } from "./Champs"
import { Formulaire } from "./Formulaire"

export function FormulairePublicite() {
  return (
    <Formulaire
      type="publicite"
      libelleEnvoi="Demander une offre"
      succes={{
        titre: "Demande reçue.",
        texte: "Notre équipe revient vers vous rapidement pour construire une proposition adaptée.",
      }}
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <ChampTexte name="nom" libelle="Nom et prénom" autoComplete="name" />
        <ChampTexte
          name="entreprise"
          libelle="Entreprise ou structure"
          autoComplete="organization"
        />
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
        <ChampChoix
          name="besoin"
          libelle="Votre besoin"
          options={besoinsPub}
          className="sm:col-span-2"
        />
        <ChampZone
          name="message"
          libelle="Votre projet"
          facultatif
          placeholder="Objectif, période, zone visée, budget indicatif…"
          className="sm:col-span-2"
        />
      </div>
      <CaseConsentement>
        J&apos;accepte que Radio Tripoint utilise ces informations pour me recontacter au sujet de
        ma demande.{" "}
        <Link href="/politique-confidentialite" className="lien">
          En savoir plus
        </Link>
      </CaseConsentement>
    </Formulaire>
  )
}
