/**
 * Schéma d'orientation du territoire, centré sur le tripoint de Schengen
 * (49,4697 N · 6,3672 E). Chaque ville est placée selon son cap RÉEL
 * depuis ce point ; la distance est compressée (logarithme) pour que
 * Schengen et Luxembourg-Ville tiennent sur le même schéma. Ce n'est donc
 * pas une carte, et le schéma le dit.
 */
const TRIPOINT = { lat: 49.4697, lon: 6.3672 }
const KM_LAT = 111.2
const KM_LON = 111.32 * Math.cos((TRIPOINT.lat * Math.PI) / 180)

const villes: {
  nom: string
  lat: number
  lon: number
  pays: "FR" | "LU" | "DE"
  ancre?: "start" | "end" | "middle"
  dy?: number
}[] = [
  { nom: "Schengen", lat: 49.4718, lon: 6.3598, pays: "LU", ancre: "end" },
  { nom: "Remich", lat: 49.5449, lon: 6.3668, pays: "LU", ancre: "end" },
  { nom: "Luxembourg", lat: 49.6116, lon: 6.1319, pays: "LU", ancre: "end" },
  { nom: "Perl", lat: 49.4726, lon: 6.3913, pays: "DE", ancre: "start" },
  { nom: "Merzig · Sarre", lat: 49.4433, lon: 6.6375, pays: "DE", ancre: "end" },
  { nom: "Apach", lat: 49.4589, lon: 6.3745, pays: "FR", ancre: "start" },
  { nom: "Sierck-les-Bains", lat: 49.4401, lon: 6.3578, pays: "FR", ancre: "start" },
  { nom: "Thionville", lat: 49.3579, lon: 6.1683, pays: "FR", ancre: "start" },
]

const C = 300
const place = (lat: number, lon: number) => {
  const dx = (lon - TRIPOINT.lon) * KM_LON
  const dy = (lat - TRIPOINT.lat) * KM_LAT
  const km = Math.hypot(dx, dy)
  const d = 34 + 62 * Math.log1p(km)
  const a = Math.atan2(dx, dy) // cap depuis le nord, sens horaire
  return { x: C + d * Math.sin(a), y: C - d * Math.cos(a) }
}

const rayon = (capDeg: number, l = 300) => {
  const a = (capDeg * Math.PI) / 180
  return { x: C + l * Math.sin(a), y: C - l * Math.cos(a) }
}

export function SchemaTerritoire() {
  const ouest = rayon(270)
  const nord = rayon(0)
  const sudEst = rayon(135, 330)
  return (
    <figure className="relative">
      <svg
        viewBox="0 0 600 600"
        className="h-auto w-full"
        role="img"
        aria-labelledby="schema-titre schema-desc"
      >
        <title id="schema-titre">Schéma d&apos;orientation des Trois Frontières</title>
        <desc id="schema-desc">
          Le tripoint de Schengen au centre. Au nord-ouest le Luxembourg (Schengen, Remich,
          Luxembourg), à l&apos;est l&apos;Allemagne (Perl, Merzig), au sud-ouest la France (Apach,
          Sierck-les-Bains, Thionville). Distances non à l&apos;échelle.
        </desc>
        {[90, 170, 250].map((r) => (
          <circle
            key={r}
            cx={C}
            cy={C}
            r={r}
            fill="none"
            stroke="var(--nuit-trait)"
            strokeDasharray="2 6"
          />
        ))}
        <g
          fill="currentColor"
          className="text-nuit-encre"
          opacity={0.13}
          style={{
            fontFamily: "var(--font-archivo)",
            fontWeight: 800,
            fontVariationSettings: '"wdth" 118',
            letterSpacing: "-0.02em",
          }}
        >
          <text x={125} y={150} fontSize={56} textAnchor="middle">
            LU
          </text>
          <text x={500} y={210} fontSize={56} textAnchor="middle">
            DE
          </text>
          <text x={150} y={470} fontSize={56} textAnchor="middle">
            FR
          </text>
        </g>
        <g stroke="var(--nuit-accent)" strokeWidth={2}>
          <line x1={C} y1={C} x2={ouest.x} y2={ouest.y} />
          <line x1={C} y1={C} x2={nord.x} y2={nord.y} />
          <line x1={C} y1={C} x2={sudEst.x} y2={sudEst.y} />
        </g>
        <text
          x={C + 8}
          y={34}
          fill="var(--nuit-encre-2)"
          fontSize={15}
          style={{ letterSpacing: "0.14em" }}
        >
          LA MOSELLE
        </text>
        {villes.map((v) => {
          const p = place(v.lat, v.lon)
          const ancre = v.ancre ?? "start"
          const dx = ancre === "start" ? 12 : ancre === "end" ? -12 : 0
          return (
            <g key={v.nom}>
              <circle cx={p.x} cy={p.y} r={5} fill="var(--nuit-encre)" />
              <text
                x={p.x + dx}
                y={p.y + 6 + (v.dy ?? 0)}
                textAnchor={ancre}
                fill="var(--nuit-encre)"
                fontSize={19}
                fontWeight={600}
              >
                {v.nom}
              </text>
            </g>
          )
        })}
        <circle cx={C} cy={C} r={8} fill="var(--nuit-accent)" />
        <circle cx={C} cy={C} r={17} fill="none" stroke="var(--nuit-accent)" strokeOpacity={0.5} />
      </svg>
      <figcaption className="text-nuit-encre-2 mt-2 text-xs">
        Schéma d&apos;orientation centré sur le tripoint de Schengen · directions réelles, distances
        non à l&apos;échelle.
      </figcaption>
    </figure>
  )
}
