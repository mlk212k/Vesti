"use client";

/**
 * Écran d'attente de l'analyse.
 *
 * Une analyse prend une vingtaine de secondes. Ce n'est pas un temps qu'on peut
 * raccourcir — l'appel au modèle dure ce qu'il dure — mais c'est un temps qu'on
 * peut rendre supportable. Trois choses y suffisent, et elles sont toutes ici :
 *
 *  1. quelque chose bouge en permanence, donc rien n'a l'air figé ni planté ;
 *  2. la photo qu'on vient de prendre est à l'écran, balayée par un faisceau :
 *     l'attente a visiblement un objet ;
 *  3. la progression avance sans à-coups, au lieu de sauter d'un texte à l'autre.
 *
 * ⚠️ La barre n'annonce jamais un pourcentage, et n'atteint jamais le bout avant
 * que le verdict ne soit là. Chaque palier correspond à une étape réellement
 * franchie : envoi terminé, analyse lancée, verdict en rédaction. Une jauge qui
 * courrait toute seule vers 100 % serait un mensonge, et le premier écran
 * d'attente qui ment est aussi le dernier qu'on croit.
 */
const STAGES = [
  "Envoi de ta photo…",
  "Lecture des pièces et des couleurs…",
  "Rédaction du verdict…",
];

/**
 * Plafond de la jauge pour chaque étape. La transition CSS l'atteint lentement,
 * donc la barre progresse encore quand l'étape dure plus longtemps que prévu —
 * sans jamais dépasser ce que l'on sait vraiment.
 */
const STAGE_CEILING = [34, 76, 94];

export function AnalysisProgress({
  photoUrl,
  stage,
}: {
  photoUrl: string;
  stage: number;
}) {
  const ceiling = STAGE_CEILING[Math.min(stage, STAGE_CEILING.length - 1)];

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 py-12">
      {photoUrl && (
        <div className="relative h-56 w-56 overflow-hidden rounded-[var(--radius-card)] shadow-[var(--shadow-lift)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photoUrl}
            alt="Ta tenue en cours d'analyse"
            className="h-full w-full object-cover"
          />
          {/* Voile violet : rattache la photo à l'identité de l'app pendant
              l'attente, et fait ressortir le faisceau. */}
          <div className="absolute inset-0 bg-accent/15" aria-hidden />
          {/* Le faisceau qui balaie la photo, de haut en bas, sans fin. */}
          <div className="vesti-scan" aria-hidden />
        </div>
      )}

      <div className="flex w-full max-w-[280px] flex-col gap-4">
        <div
          className="h-1.5 w-full overflow-hidden rounded-full bg-accent-soft"
          role="progressbar"
          aria-label="Analyse en cours"
        >
          <div
            className="h-full rounded-full bg-accent"
            // Transition longue : la barre glisse au lieu de sauter, et continue
            // d'avancer tant que l'étape dure.
            style={{ width: `${ceiling}%`, transition: "width 9s ease-out" }}
          />
        </div>

        <p
          key={stage}
          className="vesti-fade-in text-center text-sm font-semibold"
          aria-live="polite"
        >
          {STAGES[Math.min(stage, STAGES.length - 1)]}
        </p>
      </div>
    </div>
  );
}
