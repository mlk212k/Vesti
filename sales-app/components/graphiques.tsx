import { formatCentsShort } from "@/lib/money";

// Graphiques dessinés à la main en SVG.
//
// Une librairie de charts pèserait plus lourd que tout le reste de l'app pour
// deux formes simples, imposerait son propre thème clair, et obligerait à
// passer ces composants côté client. Ici tout est rendu sur le serveur.

export type PointSerie = {
  label: string;
  valeur: number;
  detail?: string;
};

// Histogramme. Les barres partent du bas, la plus haute donne l'échelle.
export function Histogramme({
  points,
  format = "montant",
  hauteur = 160,
}: {
  points: PointSerie[];
  format?: "montant" | "nombre";
  hauteur?: number;
}) {
  if (points.length === 0) {
    return (
      <p className="panneau-creux px-4 py-10 text-center text-sm text-faint">
        Aucune donnée sur la période.
      </p>
    );
  }

  const max = Math.max(...points.map((p) => p.valeur), 1);
  const largeurBarre = 100 / points.length;

  return (
    <div className="panneau p-4">
      <div
        className="flex items-stretch gap-[2px]"
        style={{ height: hauteur }}
        role="img"
        aria-label={`Graphique de ${points.length} valeurs`}
      >
        {points.map((point, index) => {
          const ratio = point.valeur / max;
          return (
            <div
              key={`${point.label}-${index}`}
              className="group relative flex h-full flex-1 flex-col justify-end"
              style={{ width: `${largeurBarre}%` }}
            >
              <span
                className="w-full rounded-t-xl transition-all"
                style={{
                  height: `${Math.max(ratio * 100, point.valeur > 0 ? 3 : 0.8)}%`,
                  background:
                    point.valeur > 0
                      ? "linear-gradient(180deg, #ffa878 0%, var(--peche) 100%)"
                      : "rgba(255,255,255,0.05)",
                  boxShadow:
                    point.valeur > 0
                      ? "none"
                      : "none",
                }}
                title={`${point.label} : ${
                  format === "montant"
                    ? formatCentsShort(point.valeur)
                    : point.valeur
                }`}
              />
            </div>
          );
        })}
      </div>

      <div className="mt-2 flex justify-between text-sm text-faint">
        <span>{points[0]?.label}</span>
        {points.length > 2 ? (
          <span>{points[Math.floor(points.length / 2)]?.label}</span>
        ) : null}
        <span>{points[points.length - 1]?.label}</span>
      </div>

      <div className="mt-1 flex justify-between text-sm text-faint">
        <span>Max</span>
        <span className="chiffre text-dim">
          {format === "montant" ? formatCentsShort(max) : max}
        </span>
      </div>
    </div>
  );
}

// Classement horizontal : une ligne par membre, barre proportionnelle au
// meilleur. Plus lisible qu'un camembert dès qu'il y a plus de trois parts.
export function Classement({
  points,
  format = "montant",
}: {
  points: PointSerie[];
  format?: "montant" | "nombre";
}) {
  if (points.length === 0) {
    return (
      <p className="panneau-creux px-4 py-8 text-center text-sm text-faint">
        Aucune donnée.
      </p>
    );
  }

  const max = Math.max(...points.map((p) => p.valeur), 1);

  return (
    <ul className="space-y-2.5">
      {points.map((point, index) => (
        <li key={point.label} className="panneau p-3.5">
          <div className="mb-2 flex items-baseline justify-between gap-2">
            <span className="flex items-center gap-2 truncate text-sm">
              <span className="chiffre w-5 text-faint">{index + 1}</span>
              {point.label}
            </span>
            <span className="chiffre shrink-0 text-base">
              {format === "montant"
                ? formatCentsShort(point.valeur)
                : point.valeur}
            </span>
          </div>
          <div className="barre">
            <div
              className="barre-remplie"
              style={{ width: `${Math.max((point.valeur / max) * 100, 2)}%` }}
            />
          </div>
          {point.detail ? (
            <p className="mt-1.5 text-sm text-faint">{point.detail}</p>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
