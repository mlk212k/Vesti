import type { Metadata } from "next";
import { LEGAL } from "@/lib/legal";
import { SITE_NAME } from "@/lib/site";

export const metadata: Metadata = { title: `Politique de confidentialité — ${SITE_NAME}` };

export default function ConfidentialitePage() {
  return (
    <>
      <h1 className="text-[1.9rem] font-extrabold leading-[1.05]">
        Politique de confidentialité
      </h1>

      <section className="flex flex-col gap-2">
        <h2 className="text-base font-semibold">Responsable du traitement</h2>
        <p>
          {LEGAL.editeur} ({LEGAL.siret}), {LEGAL.adresse}. Pour toute question
          ou demande relative à tes données : {LEGAL.emailRgpd}.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-base font-semibold">Ce que nous collectons</h2>
        <ul className="flex flex-col gap-1">
          <li>
            <strong>Ton email</strong>, pour créer ton compte et t&apos;y
            connecter.
          </li>
          <li>
            <strong>Tes photographies</strong> de tenues et de dressing, et les
            descriptions de vêtements qui en sont extraites.
          </li>
          <li>
            <strong>Ton profil</strong> : genre, taille, poids, morphologie,
            styles préférés. Tous ces champs sont facultatifs et modifiables.
          </li>
          <li>
            <strong>Ta position approximative</strong>, uniquement si tu
            l&apos;actives pour la tenue du jour. Elle est arrondie à environ un
            kilomètre : nous ne conservons pas ta position exacte.
          </li>
          <li>
            <strong>Ton abonnement</strong> : formule, statut, échéances. Les
            coordonnées bancaires sont traitées par Stripe et ne nous parviennent
            jamais.
          </li>
          <li>
            <strong>Un éventuel code</strong> saisi à l&apos;inscription, pour
            savoir par quel intermédiaire tu nous as connus.
          </li>
        </ul>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-base font-semibold">Pourquoi, et sur quelle base</h2>
        <p>
          Ces données servent exclusivement à fournir le service auquel tu as
          souscrit : analyser tes tenues, tenir ta garde-robe, gérer ton
          abonnement. La base légale est <strong>l&apos;exécution du contrat</strong>{" "}
          pour le service et la facturation, et <strong>ton consentement</strong>{" "}
          pour la géolocalisation, que tu peux retirer à tout moment.
        </p>
        <p>
          Tes photographies et ton profil{" "}
          <strong>ne servent jamais à entraîner un modèle</strong>, ne sont ni
          vendus ni transmis à des annonceurs.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-base font-semibold">Qui y a accès</h2>
        <p>
          Nous faisons appel aux prestataires suivants, uniquement pour faire
          fonctionner le service :
        </p>
        <ul className="flex flex-col gap-1">
          {LEGAL.sousTraitants.map((s) => (
            <li key={s.nom}>
              <strong>{s.nom}</strong> ({s.lieu}) — {s.role} : {s.donnees}.
            </li>
          ))}
        </ul>
        <p>
          Certains de ces prestataires sont établis{" "}
          <strong>en dehors de l&apos;Union européenne</strong>, notamment aux
          États-Unis pour l&apos;analyse des photographies. Ces transferts sont
          encadrés par les clauses contractuelles types de la Commission
          européenne.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-base font-semibold">Combien de temps</h2>
        <ul className="flex flex-col gap-1">
          <li>Compte, photographies et garde-robe : conservés tant que ton compte existe.</li>
          <li>
            Après suppression du compte : effacement sous trente jours, hors
            obligations comptables.
          </li>
          <li>
            Factures et pièces comptables : dix ans, conformément au code de
            commerce.
          </li>
        </ul>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-base font-semibold">Tes droits</h2>
        <p>
          Tu disposes d&apos;un droit d&apos;accès, de rectification,
          d&apos;effacement, de limitation, d&apos;opposition et de portabilité
          sur tes données. Écris à {LEGAL.emailRgpd} : nous répondons sous un
          mois. Tu peux également introduire une réclamation auprès de la CNIL
          (
          <a
            href="https://www.cnil.fr"
            className="underline underline-offset-2"
            target="_blank"
            rel="noopener noreferrer"
          >
            cnil.fr
          </a>
          ).
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-base font-semibold">Cookies</h2>
        <p>
          {SITE_NAME} ne dépose que les cookies nécessaires à son fonctionnement :
          ta session de connexion, et le code éventuellement transmis à ton
          arrivée. Aucun cookie publicitaire ni de mesure d&apos;audience
          tierce n&apos;est utilisé ; aucun consentement n&apos;est donc requis à
          ce titre.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-base font-semibold">Mineurs</h2>
        <p>
          Le service n&apos;est pas destiné aux personnes de moins de quinze ans.
          Si tu constates qu&apos;un compte a été créé par un mineur de moins de
          quinze ans, signale-le à {LEGAL.emailRgpd} : il sera supprimé.
        </p>
      </section>
    </>
  );
}
