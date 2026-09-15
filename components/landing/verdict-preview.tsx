import { CheckIcon } from "@/components/ui/check-icon";
import { ArrowIcon } from "@/components/ui/arrow-icon";

/**
 * Ce que Vesti rend, montré AVANT de demander quoi que ce soit.
 *
 * ── Pourquoi cet écran existe ───────────────────────────────────────────────
 *
 * Mesuré : 758 visiteurs sur la page d'accueil, 28 ont appuyé sur « Analyser ma
 * tenue ». 3,7 %. Ceux qui franchissent la marche vont au bout (57 % arrivent
 * dans l'app), donc le problème n'est pas l'inscription — il est avant.
 *
 * Et la raison saute aux yeux une fois posée : la page ne montrait RIEN du
 * produit. Un logo, un titre, une phrase, un bouton. Quelqu'un qui arrive de
 * TikTok devait créer un compte pour découvrir à quoi ressemble un verdict.
 * C'est le même défaut que la porte d'installation retirée plus tôt — demander
 * un engagement avant d'avoir montré la valeur — simplement déplacé d'un cran.
 *
 * ⚠️ C'EST UN EXEMPLE, ET ÇA DOIT SE VOIR. L'étiquette n'est pas une précaution
 * juridique, c'est la même règle que « Similaire » sur les photos catalogue et
 * « d'après toi » sur les jauges d'inscription : on ne fait jamais passer du
 * contenu fabriqué pour une mesure. Un score inventé présenté comme le verdict
 * de quelqu'un serait un faux témoignage.
 *
 * ── Pourquoi ce n'est pas `ScoreHeader` ─────────────────────────────────────
 *
 * La tentation est de réutiliser le vrai bandeau de verdict — trois
 * duplications ont déjà été payées dans ce code. Mais ce n'en est pas une :
 * `ScoreHeader` court d'un bord à l'autre, sans cadre, parce qu'il EST le
 * moment de récompense. Ici on montre une vignette, encadrée et étiquetée,
 * posée dans une page de vente. Bord à bord, elle se lirait comme le verdict de
 * la personne qui regarde. Deux rôles opposés, deux objets.
 *
 * Les icônes, elles, sont bien partagées : une coche reste une coche.
 */
export function VerdictPreview() {
  return (
    <figure className="m-0 flex flex-col gap-0 overflow-hidden rounded-[var(--radius-card)] border border-border-soft bg-surface">
      {/* Le bandeau violet, en réduction. Le score garde la police de titre :
          c'est lui qu'on vient voir. */}
      <div className="flex items-center gap-4 bg-accent px-5 py-3.5 text-accent-foreground">
        <span className="font-display text-[38px] leading-none tabular-nums">82</span>
        <div className="flex flex-col gap-0.5">
          <span className="label opacity-75">sur 100</span>
          <span className="text-sm font-semibold">Soirée</span>
        </div>
      </div>

      {/*
        ⚠️ CHAQUE LIGNE EST COMPTÉE, et les textes sont courts pour cette
        raison. Au premier jet, la vignette était plus bavarde : le bouton
        « Analyser ma tenue » tombait à 870 px sur un écran de 844, donc sous la
        ligne de flottaison. Mesuré, pas supposé. Montrer le produit en cachant
        le bouton aurait aggravé exactement ce qu'on essaie de corriger.

        Les remarques tiennent donc sur une ligne chacune. C'est aussi plus près
        de ce que rend l'app : un verdict utile est sec.
      */}
      <div className="flex flex-col gap-3 px-5 py-4">
        <p className="text-[15px] leading-relaxed">
          Base sobre, bien tenue. Il manque un point de mire.
        </p>

        <div className="flex flex-col gap-2 border-t border-border-soft pt-3">
          <span className="label text-muted">Ce qui marche</span>
          <ul className="flex flex-col gap-1.5">
            <li className="flex gap-2 text-sm leading-relaxed">
              <CheckIcon className="text-success" />
              <span>Le camaïeu de beiges reste net.</span>
            </li>
            <li className="flex gap-2 text-sm leading-relaxed">
              <CheckIcon className="text-success" />
              <span>La veste structurée équilibre le bas.</span>
            </li>
          </ul>
        </div>

        <div className="flex flex-col gap-2 border-t border-border-soft pt-3">
          <span className="label text-muted">À ajuster</span>
          <ul className="flex flex-col gap-1.5">
            <li className="flex gap-2 text-sm leading-relaxed">
              <ArrowIcon className="text-accent" />
              <span>Une chaussure plus fine allongerait la jambe.</span>
            </li>
          </ul>
        </div>
      </div>

      {/* ⚠️ L'étiquette. Elle est DANS le cadre et non sous lui : détachée, elle
          se lirait comme une légende de la page, pas comme une mention portée
          par la vignette elle-même. */}
      <figcaption className="border-t border-border-soft bg-surface-sunken px-5 py-2.5 text-center text-xs text-muted">
        Exemple d&apos;analyse. La tienne portera sur ta photo.
      </figcaption>
    </figure>
  );
}
