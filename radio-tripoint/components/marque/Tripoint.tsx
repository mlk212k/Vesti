/**
 * Le motif signature : trois rayons issus d'un point, orientés comme les
 * frontières réelles au tripoint de Schengen — ouest (FR/LU), nord (la
 * Moselle, LU/DE), sud-est (FR/DE). Décoratif : aria-hidden.
 */
export function Tripoint({
  className,
  epaisseur = 1.5,
  point = true,
}: {
  className?: string
  epaisseur?: number
  point?: boolean
}) {
  // Rayons de longueur 100 depuis (100,100).
  return (
    <svg viewBox="0 0 200 200" className={className} aria-hidden="true" focusable="false">
      <g
        stroke="currentColor"
        strokeWidth={epaisseur}
        vectorEffect="non-scaling-stroke"
        fill="none"
        strokeLinecap="square"
      >
        <line x1="100" y1="100" x2="0" y2="100" vectorEffect="non-scaling-stroke" />
        <line x1="100" y1="100" x2="100" y2="0" vectorEffect="non-scaling-stroke" />
        <line x1="100" y1="100" x2="170.7" y2="170.7" vectorEffect="non-scaling-stroke" />
      </g>
      {point && <circle cx="100" cy="100" r="5" fill="currentColor" />}
    </svg>
  )
}
