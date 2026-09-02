import type { ScoreTrend } from "@/lib/stats";

const WIDTH = 300;
const HEIGHT = 90;
/** Marge gauche : laisse la place aux graduations de l'axe. */
const PAD_LEFT = 24;
const PAD_RIGHT = 10;
const PAD_TOP = 10;
const PAD_BOTTOM = 14;

/**
 * Évolution des scores dans le temps : une seule série, donc une seule couleur
 * et aucune légende — le titre de la section dit déjà ce qui est tracé.
 *
 * L'échelle Y est fixée à 0-100, l'échelle réelle de la note. Un domaine
 * recalculé sur les valeurs ferait passer un 70 → 72 pour une envolée : c'est le
 * piège classique du sparkline, qui donne du sens à du bruit.
 */
export function ScoreTrendChart({ trend }: { trend: ScoreTrend }) {
  const { points } = trend;

  if (points.length < 2) {
    return (
      <p className="text-sm text-muted">
        Encore une analyse et ta courbe de progression apparaît ici.
      </p>
    );
  }

  const plotHeight = HEIGHT - PAD_TOP - PAD_BOTTOM;
  const step = (WIDTH - PAD_LEFT - PAD_RIGHT) / (points.length - 1);

  const coords = points.map((point, index) => ({
    ...point,
    x: PAD_LEFT + index * step,
    y: PAD_TOP + plotHeight * (1 - point.score / 100),
  }));

  const line = coords.map((c) => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(" ");
  const baseline = PAD_TOP + plotHeight;
  const area = `${PAD_LEFT},${baseline} ${line} ${PAD_LEFT + (points.length - 1) * step},${baseline}`;
  const last = coords[coords.length - 1];

  return (
    <figure className="flex flex-col gap-1">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="h-auto w-full"
        role="img"
        aria-label={`Évolution de tes scores : ${points.map((p) => p.score).join(", ")}`}
      >
        {/* Graduations : hairline pleine et discrète, avec la valeur en regard.
            Sans elles, seul le dernier point serait chiffré et les autres
            deviendraient illisibles. */}
        {[0, 50, 100].map((value) => {
          const y = PAD_TOP + plotHeight * (1 - value / 100);
          return (
            <g key={value}>
              <line
                x1={PAD_LEFT}
                x2={WIDTH - PAD_RIGHT}
                y1={y}
                y2={y}
                stroke="var(--border)"
                strokeWidth={1}
              />
              <text
                x={PAD_LEFT - 6}
                y={y + 3.5}
                textAnchor="end"
                className="fill-muted"
                fontSize={9}
              >
                {value}
              </text>
            </g>
          );
        })}

        {/* Le remplissage n'est qu'un lavis : la ligne porte l'information. */}
        <polygon points={area} fill="var(--highlight)" opacity={0.1} />

        <polyline
          points={line}
          fill="none"
          stroke="var(--highlight)"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Pas de <title> par point : React 19 hisse les <title> vers le <head>
            comme métadonnée de document, ce qui casse l'hydratation. Les valeurs
            exactes restent lisibles dans la liste des analyses, qui fait office
            de vue tabulaire du graphique. */}
        {coords.map((coord) => (
          <circle
            key={coord.id}
            cx={coord.x}
            cy={coord.y}
            r={coord.id === last.id ? 5 : 3.5}
            fill="var(--highlight)"
            // Anneau à la couleur de la surface : le point reste lisible là où
            // il chevauche la ligne.
            stroke="var(--surface)"
            strokeWidth={2}
          />
        ))}

        {/* Un seul label direct, sur le dernier point : une valeur sur chaque
            point deviendrait illisible et ne serait pas lue. */}
        <text
          x={Math.min(last.x, WIDTH - PAD_RIGHT - 8)}
          y={Math.max(last.y - 10, 12)}
          textAnchor="middle"
          className="fill-foreground"
          fontSize={13}
          fontWeight={700}
        >
          {last.score}
        </text>
      </svg>
      <figcaption className="text-xs text-muted">
        Tes {points.length} dernières analyses, sur 100.
      </figcaption>
    </figure>
  );
}
