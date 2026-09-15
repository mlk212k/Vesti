import type { ReactNode } from "react";

/**
 * Le bandeau de score — l'écran de récompense.
 *
 * ⚠️ POURQUOI IL EST EXTRAIT. Ce bloc existait en DEUX copies : dans
 * `VerdictCard` (juste après l'analyse) et dans `AnalysisDetail` (en relisant
 * une analyse passée), sous un commentaire disant « volontairement proche de
 * l'écran rendu juste après l'analyse ». Volontairement proche, donc destiné à
 * diverger — et c'est arrivé à la première retouche de registre : l'un est
 * passé bord à bord, l'autre est resté encadré.
 *
 * C'est la troisième duplication de ce genre dans ce code, après la chaîne de
 * classes du bouton et le triplet du panneau. Deux copies d'une décision de
 * design ne restent jamais identiques.
 *
 * ── Les choix du bandeau ────────────────────────────────────────────────────
 *
 * Le violet court d'un bord à l'autre (`-mx-5`), sans panneau autour. Un aplat
 * de couleur arrêté à 20 px du bord, avec une bordure, se lit comme une carte
 * posée sur une page ; bord à bord, il se lit comme un moment. Même règle que
 * la grille de garde-robe : ce qui est l'objet principal ne s'encadre pas.
 *
 * Le score est à 68 px dans la police de titre — la seule occasion de l'app où
 * elle a assez de place pour se déployer.
 */
export function ScoreHeader({
  score,
  occasion,
  children,
}: {
  score: number | null;
  occasion: string | null;
  /** Ce qui s'affiche sous le score : le verdict, une date, les deux. */
  children: ReactNode;
}) {
  return (
    <section className="-mx-5 flex flex-col">
      <div className="flex flex-col items-center gap-1 bg-accent px-6 py-10 text-accent-foreground">
        <span className="font-display text-[68px] leading-none tabular-nums">
          {score ?? "—"}
        </span>
        <span className="label opacity-75">sur 100</span>
      </div>

      <div className="flex flex-col items-center gap-3 px-6 pt-6 text-center">
        {children}
        {/* L'occasion était une pastille violette. En micro-libellé, elle classe
            sans poser une seconde tache de couleur sous un aplat qui en est
            déjà une. */}
        {occasion && <span className="label text-muted">{occasion}</span>}
      </div>
    </section>
  );
}
