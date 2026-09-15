"use client";

import { Button } from "@/components/ui/button";
import { insightsFrom, wasteComparison, type Habits } from "@/lib/habits";

/**
 * Le récapitulatif : on rend à la personne ses propres chiffres, multipliés.
 *
 * ── Ce que cet écran a le droit de dire, et ce qu'il n'a pas le droit de dire ─
 *
 * Il a le droit de faire une multiplication. « 20 minutes » et « 121 heures par
 * an » sont la même réponse ; la seconde est simplement celle que personne ne
 * calcule tout seul, et la voir est utile.
 *
 * ⚠️ Il n'a PAS le droit de faire passer ça pour une mesure. Ces chiffres
 * sortent de quatre curseurs déplacés en trente secondes. Trois garde-fous, et
 * ils sont dans le rendu, pas seulement dans ce commentaire :
 *
 *  1. Le titre dit « d'après toi », et chaque ligne rappelle SOUS le chiffre la
 *     réponse qui l'a produit. On peut ainsi contester le chiffre en voyant
 *     d'où il vient — et se dire « non, plutôt 10 minutes » est une réaction
 *     saine qu'on ne cherche pas à empêcher.
 *
 *  2. Rien n'est promis. Vesti ne récupère pas 576 €, et écrire qu'il les
 *     récupère serait un argument de vente qui deviendrait un remboursement
 *     trois mois plus tard. La phrase finale le dit franchement.
 *
 *  3. La comparaison au prix ne s'affiche que si elle est en notre défaveur
 *     possible — voir `wasteComparison`, qui rend `null` quand le gaspillage
 *     déclaré est inférieur au prix de l'abonnement. Ne pas la retourner en
 *     notre faveur est tout l'intérêt du calcul.
 *
 * L'écran doit enfin supporter de n'avoir RIEN à dire : quelqu'un qui passe
 * les jauges, ou qui répond zéro partout, arrive ici sans aucune ligne. C'est
 * un cas normal, pas une erreur.
 */
export function HabitsSummary({
  habits,
  onContinue,
}: {
  habits: Habits;
  onContinue: () => void;
}) {
  const insights = insightsFrom(habits);
  const comparison = wasteComparison(habits);

  if (insights.length === 0) {
    return (
      <div className="flex flex-1 flex-col justify-center gap-7">
        <div className="flex flex-col gap-3">
          <h1 className="text-[1.9rem] leading-[1.05]">On passe à la suite</h1>
          <p className="text-sm leading-relaxed text-muted">
            Tu n&apos;as pas répondu aux jauges, et c&apos;est très bien : elles
            servaient à te montrer tes propres chiffres, pas à nous renseigner.
          </p>
        </div>
        <Button onClick={onContinue}>Continuer</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <span className="label text-muted">D&apos;après tes réponses</span>
        <h1 className="text-[1.9rem] leading-[1.05]">
          Voilà ce que ça te coûte, chaque année
        </h1>
      </div>

      <ul className="flex flex-col">
        {insights.map((insight, i) => (
          <li
            key={insight.key}
            className={`flex flex-col gap-1 py-6 ${
              i > 0 ? "border-t border-border-soft" : ""
            }`}
          >
            <span className="font-display text-[46px] leading-none tabular-nums">
              {insight.value}
            </span>
            <span className="text-sm leading-relaxed">{insight.label}</span>
            {/* La provenance du chiffre, en petit. C'est elle qui transforme un
                grand nombre asséné en une multiplication vérifiable. */}
            <span className="text-xs leading-relaxed text-muted">
              {insight.source}
            </span>
          </li>
        ))}
      </ul>

      {comparison && (
        <section className="flex flex-col gap-3 rounded-[var(--radius-card)] bg-accent-soft p-5 text-accent-strong">
          <p className="text-sm leading-relaxed">
            Une année de Vesti coûte {comparison.price} €. D&apos;après toi, tu
            laisses {comparison.wasted.toLocaleString("fr-FR")} € par an dans des
            vêtements qui restent dans le placard
            {comparison.ratio > 1 ? ` — ${comparison.ratio} fois le prix` : ""}.
          </p>
          {/*
            ⚠️ La phrase qui empêche cet écran de devenir une promesse.
            « Vesti te fait économiser 576 € » serait le slogan évident, et il
            serait faux : on ne contrôle pas ce que la personne achète. Ce qu'on
            peut faire, c'est un avis avant l'achat. C'est moins vendeur et ça
            reste vrai dans trois mois.
          */}
          <p className="text-xs leading-relaxed">
            On ne te promet pas de récupérer cette somme. On te promet un avis
            franc avant que tu la redépenses.
          </p>
        </section>
      )}

      <Button onClick={onContinue}>Continuer</Button>
    </div>
  );
}
