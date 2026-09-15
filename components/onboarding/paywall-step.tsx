"use client";

import { Button } from "@/components/ui/button";
import { PlanPicker } from "@/components/billing/plan-picker";
import { LegalLinks } from "@/components/legal-links";
import { wasteComparison, type Habits } from "@/lib/habits";
import { formatAmount } from "@/lib/plans";

/**
 * L'offre, à la fin de l'inscription.
 *
 * ── Pourquoi ici et pas ailleurs ────────────────────────────────────────────
 *
 * ⚠️ AVANT l'écran Discord, et c'est le point à ne pas inverser. L'étape
 * communauté se termine par un lien SORTANT : un tap sur « Rejoindre le
 * Discord » ouvre une autre application et, dans les faits, ne revient pas.
 * Placé après, ce paywall ne serait jamais vu par ceux qui acceptent
 * l'invitation — c'est-à-dire par les plus motivés.
 *
 * ── Pourquoi il répète le chiffre du récapitulatif ──────────────────────────
 *
 * Deux écrans séparent ce paywall du moment où la personne a lu « 576 € ».
 * Entre les deux, on lui a demandé son prénom et sa morphologie : de quoi
 * refroidir n'importe quoi. Le bandeau du haut rapporte donc son chiffre ici,
 * en face du prix. Sans lui, cette page est un tarif ; avec lui, c'est une
 * comparaison qu'elle a faite elle-même trente secondes plus tôt.
 *
 * ── Ce qui n'est pas négociable ─────────────────────────────────────────────
 *
 * « Plus tard » est un vrai bouton, pas un lien gris en bas de page. Un paywall
 * sans sortie évidente à la fin d'une inscription ne vend pas un abonnement :
 * il perd le compte qui vient d'être créé. Les gens qui ne paient pas
 * aujourd'hui sont ceux à qui on vendra dans trois semaines, après leur
 * première analyse.
 *
 * Et la mention des CGV est ici parce que le paiement PART d'ici : l'obligation
 * d'information précontractuelle ne se satisfait pas d'une page de facturation
 * qu'on verra après. Elle est recopiée de `app/(dashboard)/billing/page.tsx`,
 * et doit le rester si l'une des deux change.
 */
export function PaywallStep({
  habits,
  onLater,
}: {
  /** Les réponses aux jauges, pour rappeler le chiffre. Peuvent être vides. */
  habits: Habits;
  onLater: () => void;
}) {
  const comparison = wasteComparison(habits);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <span className="label text-muted">Dernière étape</span>

        {/*
          ⚠️ Le titre porte le PRIX, pas une accroche.

          « 8,99 € par mois, contre 576 € par an dans ton placard » a été essayé
          en un seul titre : trois lignes, et le nombre qu'on veut voir noyé au
          milieu d'une phrase. Le prix seul en titre, la comparaison juste en
          dessous — le chiffre frappe d'abord, la raison arrive ensuite.

          Sans chiffre à rappeler — jauges passées, ou gaspillage déclaré
          inférieur au prix annuel — on ne fabrique pas d'accroche : le titre
          redevient ce qu'il est, un choix de formule.
        */}
        {comparison ? (
          <>
            <h1 className="text-[1.9rem] leading-[1.05]">
              {formatAmount("pro")} par mois
            </h1>
            <p className="text-sm leading-relaxed">
              Contre {comparison.wasted.toLocaleString("fr-FR")} € par an qui
              dorment dans ton placard, d&apos;après tes réponses.
            </p>
          </>
        ) : (
          <h1 className="text-[1.9rem] leading-[1.05]">Choisis ta formule</h1>
        )}

        <p className="text-sm leading-relaxed text-muted">
          Sans engagement, résiliable à tout moment. Tu peux aussi commencer
          gratuitement et décider plus tard.
        </p>
      </div>

      {/* Le sélecteur de la page d'abonnement, tel quel. Le recopier ici
          produirait deux grilles tarifaires à tenir d'accord — et c'est la
          grille tarifaire qu'on peut le moins se permettre de laisser
          diverger.

          ⚠️ `currentPlan={null}` et surtout pas `"free"` : avec `"free"`, le
          sélecteur entourait la carte Découverte d'une bordure violette et y
          écrivait « Ton plan actuel ». Sur une page dont le seul but est de
          vendre, la mise en avant allait donc au gratuit. `null` dit « pas de
          plan en cours », et l'accent passe sur Pro. */}
      <PlanPicker currentPlan={null} />

      <Button variant="ghost" onClick={onLater}>
        Plus tard
      </Button>

      <p className="text-center text-xs leading-relaxed text-muted">
        En souscrivant, tu acceptes les CGV. Abonnement mensuel sans engagement,
        résiliable à tout moment, avec 14 jours de rétractation.
      </p>
      <LegalLinks />
    </div>
  );
}
