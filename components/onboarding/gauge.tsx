"use client";

import { useId, useState } from "react";

/**
 * La jauge : une question à laquelle on répond en faisant glisser.
 *
 * ── ⚠️ LE POINT CENTRAL : la position n'est pas une réponse ─────────────────
 *
 * Un curseur affiche toujours quelque chose. Il démarre quelque part, et cette
 * position ressemble à une réponse alors que personne ne l'a donnée. Le piège
 * classique est d'enregistrer ce départ : on récolte alors une base pleine de
 * « 15 minutes » qui ne sont l'avis de personne — puis on les ressert à la
 * personne sur l'écran suivant, en lui annonçant SON chiffre. C'est de la
 * donnée fabriquée, rendue à son prétendu auteur.
 *
 * D'où `touched`. Tant qu'on n'a pas bougé le curseur, la valeur affichée est
 * « — » et le parent reçoit `null`. Le pouce est bien au milieu de la barre,
 * mais l'écran ne prétend pas que ça veut dire quelque chose. La personne voit
 * qu'elle n'a pas répondu, et passer devient un choix explicite plutôt qu'un
 * accident.
 *
 * ── Ce qui est fait à la main, et pourquoi ──────────────────────────────────
 *
 * `<input type="range">` natif plutôt qu'un curseur redessiné en div : il
 * apporte gratuitement le clavier (flèches, Origine/Fin), l'annonce correcte
 * au lecteur d'écran, et le comportement tactile du système. Un curseur
 * maison coûte tout ça, et le reperd à la première retouche.
 *
 * Le prix à payer est le style : un range ne s'habille qu'avec les
 * pseudo-éléments `::-webkit-slider-*` et `::-moz-range-*`, qui ne se
 * factorisent pas entre navigateurs. D'où les classes arbitraires, écrites
 * DEUX fois plus bas — ce n'est pas une duplication qu'on peut retirer.
 */
export function Gauge({
  value,
  onChange,
  bounds,
  start,
  step,
  format,
  ends,
  labelledBy,
}: {
  /** `null` = pas encore répondu. */
  value: number | null;
  onChange: (value: number) => void;
  bounds: { min: number; max: number };
  start: number;
  step: number;
  format: (value: number) => string;
  ends: readonly [string, string];
  /** Id du titre de la question : c'est lui qui nomme le curseur. */
  labelledBy: string;
}) {
  // Position du pouce quand rien n'a été répondu. Gardée en état local pour
  // que le curseur reste là où on l'a lâché même si le parent renvoie `null`.
  const [resting] = useState(start);
  const position = value ?? resting;
  const answered = value !== null;

  const ratio = (position - bounds.min) / (bounds.max - bounds.min);
  const percent = Math.round(ratio * 100);
  const hintId = useId();

  return (
    <div className="flex flex-col gap-4">
      {/*
        L'emplacement de la réponse, au-dessus de la barre.

        Hauteur fixe : la consigne et la valeur occupent la MÊME ligne, l'une
        remplaçant l'autre. Sans ça, répondre pousse la barre vers le bas au
        moment précis où le doigt est dessus.

        ⚠️ Quand rien n'est répondu, on écrit la consigne et pas un tiret. Un
        « — » à 44 px ne se lit pas comme « pas de réponse » : il se lit comme
        un filet de séparation posé là par erreur. Essayé, vu à l'écran,
        remplacé.
      */}
      <div className="flex min-h-[46px] items-end">
        {answered ? (
          // `<output>` et pas `<span>` : c'est l'élément qui existe pour
          // « résultat d'un contrôle », et il est annoncé comme tel. Dans la
          // police de titre, parce que c'est le seul chiffre de l'écran.
          <output
            htmlFor={labelledBy}
            className="font-display text-[42px] leading-none tabular-nums"
          >
            {format(position)}
          </output>
        ) : (
          <p id={hintId} className="pb-2 text-sm text-muted">
            Fais glisser le curseur pour répondre.
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <input
          type="range"
          min={bounds.min}
          max={bounds.max}
          step={step}
          value={position}
          onChange={(event) => onChange(Number(event.target.value))}
          aria-labelledby={labelledBy}
          aria-describedby={answered ? undefined : hintId}
          /*
            ⚠️ `aria-valuetext` ou le lecteur d'écran annonce « 20 », un nombre
            nu dont on ne sait pas s'il s'agit de minutes, d'euros ou d'une
            note. Tant que rien n'est répondu, il annonce l'absence de réponse
            plutôt que la position du pouce — même règle qu'à l'écran.
          */
          aria-valuetext={answered ? format(position) : "Pas encore répondu"}
          /*
            ⚠️ `--gauge-fill` et pas un `background` en ligne.

            Le remplissage était d'abord posé en `style={{ background: … }}` sur
            le champ, avec `bg-clip-content` pour le restreindre à la barre de
            4 px. Résultat à l'écran : un gros galet violet de 44 px de haut.
            La raison est que `background` est une PROPRIÉTÉ RACCOURCIE — elle
            réinitialise `background-clip` au passage — et qu'un style en ligne
            l'emporte sur la classe. Le réglage se sabordait lui-même.

            La couleur descend donc par une variable, et c'est la PISTE
            elle-même (`::-webkit-slider-runnable-track`) qui la porte. Le
            dégradé est peint sur l'élément qui fait 4 px de haut : plus rien
            à rogner, plus rien à saborder.
          */
          style={{ "--gauge-fill": `${percent}%` } as React.CSSProperties}
          className={[
            // 44 px de haut pour le doigt, alors que la barre n'en fait que 4 :
            // la cible tactile est le champ entier, invisible autour du trait.
            /*
              Pas d'`outline-none` ici : l'anneau que pose `globals.css` sur
              tout `:focus-visible` n'est dans aucune couche CSS, et bat donc
              n'importe quelle utilitaire Tailwind quelle que soit la
              spécificité. Il est neutralisé là-bas, à côté de la règle qu'il
              corrige, et remplacé plus bas par un anneau posé sur le pouce.
            */
            "h-11 w-full cursor-pointer appearance-none bg-transparent",
            // Chrome / Safari — la piste porte le dégradé.
            "[&::-webkit-slider-runnable-track]:h-1 [&::-webkit-slider-runnable-track]:rounded-full",
            "[&::-webkit-slider-runnable-track]:bg-[linear-gradient(to_right,var(--accent)_var(--gauge-fill),var(--border-soft)_var(--gauge-fill))]",
            // Le pouce doit être remonté de la moitié de sa hauteur, moins la
            // moitié de celle de la piste : (28 - 4) / 2 = 12.
            "[&::-webkit-slider-thumb]:-mt-3 [&::-webkit-slider-thumb]:h-7 [&::-webkit-slider-thumb]:w-7",
            "[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full",
            "[&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-accent",
            "[&::-webkit-slider-thumb]:bg-surface [&::-webkit-slider-thumb]:shadow-[var(--shadow-lift)]",
            // Firefox — mêmes règles, autres noms. Non factorisable : un
            // sélecteur inconnu invalide toute la règle qui le contient.
            "[&::-moz-range-track]:h-1 [&::-moz-range-track]:rounded-full",
            "[&::-moz-range-track]:bg-[linear-gradient(to_right,var(--accent)_var(--gauge-fill),var(--border-soft)_var(--gauge-fill))]",
            "[&::-moz-range-thumb]:h-6 [&::-moz-range-thumb]:w-6 [&::-moz-range-thumb]:rounded-full",
            "[&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-accent [&::-moz-range-thumb]:bg-surface",
            // L'anneau de focus se pose sur le pouce, pas sur la boîte de 44 px
            // qui l'entoure : sinon il dessine un rectangle autour du vide.
            "focus-visible:[&::-webkit-slider-thumb]:outline focus-visible:[&::-webkit-slider-thumb]:outline-2",
            "focus-visible:[&::-webkit-slider-thumb]:outline-offset-2 focus-visible:[&::-webkit-slider-thumb]:outline-accent",
            "focus-visible:[&::-moz-range-thumb]:outline focus-visible:[&::-moz-range-thumb]:outline-2",
          ].join(" ")}
        />

        {/* Les deux bouts : ils disent ce que veulent dire la gauche et la
            droite, pour qu'on sache où se placer sans avoir à essayer. */}
        <div className="flex items-start justify-between gap-4 text-[11px] leading-snug text-muted">
          <span>{ends[0]}</span>
          <span className="text-right">{ends[1]}</span>
        </div>
      </div>
    </div>
  );
}
