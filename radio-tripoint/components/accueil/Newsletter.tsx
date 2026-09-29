import Link from "next/link"
import { CaseConsentement, ChampTexte } from "@/components/forms/Champs"
import { Formulaire } from "@/components/forms/Formulaire"

/** Interface prête ; les inscriptions partent vers le webhook des formulaires, sans fournisseur imposé. */
export function Newsletter() {
  return (
    <section aria-labelledby="titre-newsletter" className="border-trait bg-papier-2 border-y">
      <div className="conteneur grid gap-8 py-14 lg:grid-cols-[1fr_1fr] lg:items-center lg:py-20">
        <div>
          <p className="surtitre text-accent-encre">Newsletter</p>
          <h2 id="titre-newsletter" className="titre-section mt-2 max-w-xl">
            Restez connecté à l&apos;actualité des Trois Frontières.
          </h2>
          <p className="presse text-encre-2 mt-4 max-w-lg text-lg leading-snug">
            Les infos du territoire, les émissions à ne pas manquer et les rendez-vous de
            l&apos;agenda, directement dans votre boîte mail.
          </p>
        </div>
        <Formulaire
          type="newsletter"
          compact
          libelleEnvoi="Je m'inscris"
          succes={{
            titre: "C'est noté !",
            texte: "Votre inscription est bien enregistrée. À très vite sur Radio Tripoint.",
          }}
        >
          <ChampTexte
            name="email"
            type="email"
            libelle="Votre adresse e-mail"
            autoComplete="email"
            inputMode="email"
            placeholder="prenom@exemple.fr"
          />
          <CaseConsentement className="mt-4">
            J&apos;accepte de recevoir la newsletter de Radio Tripoint. Désinscription possible à
            tout moment.{" "}
            <Link href="/politique-confidentialite" className="lien">
              Données personnelles
            </Link>
          </CaseConsentement>
        </Formulaire>
      </div>
    </section>
  )
}
