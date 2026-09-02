import type { Metadata } from "next";
import { LEGAL } from "@/lib/legal";
import { SITE_NAME } from "@/lib/site";
import { PLANS, PLAN_ORDER, formatPrice } from "@/lib/plans";

export const metadata: Metadata = { title: `Conditions générales de vente — ${SITE_NAME}` };

export default function CgvPage() {
  const paid = PLAN_ORDER.filter((plan) => plan !== "free");

  return (
    <>
      <h1 className="text-[1.9rem] font-extrabold leading-[1.05]">
        Conditions générales de vente
      </h1>
      <p className="text-xs text-muted">
        Applicables aux abonnements souscrits sur {SITE_NAME}.
      </p>

      <section className="flex flex-col gap-2">
        <h2 className="text-base font-semibold">1. Objet</h2>
        <p>
          Les présentes conditions régissent la vente des abonnements à{" "}
          {SITE_NAME}, service en ligne d&apos;analyse vestimentaire assistée par
          intelligence artificielle, édité par {LEGAL.editeur} ({LEGAL.siret}).
          Elles s&apos;appliquent à tout consommateur au sens du code de la
          consommation.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-base font-semibold">2. Le service</h2>
        <p>
          {SITE_NAME} analyse des photographies de tenues transmises par
          l&apos;utilisateur et lui restitue un avis, des conseils et un
          inventaire de sa garde-robe. Les analyses, notes et suggestions sont
          produites automatiquement : elles constituent un avis indicatif de
          nature esthétique, sans garantie de résultat, et ne relèvent
          d&apos;aucun conseil médical, nutritionnel ou de santé.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-base font-semibold">3. Formules et prix</h2>
        <p>
          L&apos;offre gratuite donne accès à un nombre limité d&apos;analyses
          par mois. Les formules payantes, sans engagement de durée, sont :
        </p>
        <ul className="flex flex-col gap-1">
          {paid.map((plan) => (
            <li key={plan}>
              <strong>{PLANS[plan].name}</strong> — {formatPrice(plan)} TTC
            </li>
          ))}
        </ul>
        <p>
          Les prix sont indiqués en euros toutes taxes comprises. {SITE_NAME} peut
          les modifier à tout moment ; le nouveau tarif ne s&apos;applique
          qu&apos;aux échéances postérieures à son information à l&apos;abonné,
          qui reste libre de résilier.
        </p>
        <p>
          Les formules payantes sont présentées comme « illimitées » ; un plafond
          d&apos;usage raisonnable s&apos;applique afin de prévenir les usages
          automatisés ou manifestement abusifs.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-base font-semibold">4. Souscription et paiement</h2>
        <p>
          Le paiement s&apos;effectue par carte bancaire via Stripe. {SITE_NAME}{" "}
          n&apos;a jamais accès aux coordonnées bancaires. L&apos;abonnement est
          mensuel et se renouvelle automatiquement à chaque échéance, jusqu&apos;à
          résiliation.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-base font-semibold">5. Droit de rétractation</h2>
        <p>
          Conformément aux articles L221-18 et suivants du code de la
          consommation, l&apos;abonné dispose d&apos;un délai de{" "}
          <strong>quatorze jours</strong> à compter de la souscription pour se
          rétracter, sans motif ni pénalité, par simple demande à {LEGAL.email}.
        </p>
        <p>
          En demandant l&apos;accès immédiat au service, l&apos;abonné accepte que
          son exécution commence avant la fin de ce délai. S&apos;il se rétracte
          ensuite, il reste redevable du montant correspondant à la période déjà
          utilisée, au prorata (article L221-25).
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-base font-semibold">6. Résiliation</h2>
        <p>
          L&apos;abonné peut résilier à tout moment depuis son espace de
          facturation. La résiliation prend effet à la fin de la période en
          cours ; l&apos;accès reste ouvert jusque-là et aucun nouveau
          prélèvement n&apos;intervient. {SITE_NAME} peut suspendre un compte en
          cas d&apos;usage frauduleux, d&apos;impayé ou de manquement grave, après
          information de l&apos;abonné sauf urgence.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-base font-semibold">7. Obligations de l&apos;utilisateur</h2>
        <p>
          L&apos;utilisateur s&apos;engage à ne transmettre que des photographies
          dont il détient les droits et sur lesquelles ne figure aucun tiers sans
          son accord. Sont interdits les contenus illicites, à caractère sexuel,
          ainsi que les photographies de mineurs par un tiers. Le service est
          réservé aux personnes de plus de quinze ans.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-base font-semibold">8. Disponibilité et responsabilité</h2>
        <p>
          {SITE_NAME} met en œuvre les moyens raisonnables pour assurer la
          continuité du service, sans garantie d&apos;absence
          d&apos;interruption, notamment en cas de maintenance ou de défaillance
          d&apos;un prestataire tiers. La responsabilité de l&apos;éditeur ne peut
          être engagée pour les décisions d&apos;achat prises sur la base des
          suggestions du service, ni pour les contenus des sites marchands vers
          lesquels des liens sont proposés.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-base font-semibold">9. Données personnelles</h2>
        <p>
          Le traitement des données, y compris des photographies transmises, est
          décrit dans la politique de confidentialité, qui fait partie intégrante
          des présentes conditions.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-base font-semibold">10. Médiation de la consommation</h2>
        <p>
          En cas de litige non résolu directement, l&apos;abonné peut recourir
          gratuitement au médiateur de la consommation :{" "}
          {LEGAL.mediateur.nom}, {LEGAL.mediateur.adresse} —{" "}
          {LEGAL.mediateur.site}. La plateforme européenne de règlement en ligne
          des litiges est également accessible à l&apos;adresse{" "}
          <a
            href="https://ec.europa.eu/consumers/odr"
            className="underline underline-offset-2"
            target="_blank"
            rel="noopener noreferrer"
          >
            ec.europa.eu/consumers/odr
          </a>
          .
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-base font-semibold">11. Droit applicable</h2>
        <p>
          Les présentes conditions sont soumises au droit français. À défaut de
          résolution amiable, les tribunaux français sont compétents, sans
          préjudice des règles protectrices du consommateur.
        </p>
      </section>
    </>
  );
}
