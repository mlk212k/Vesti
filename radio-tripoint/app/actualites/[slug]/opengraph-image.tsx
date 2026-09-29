import { ImageResponse } from "next/og"
import { categories } from "@/data/categories"
import { articleParSlug } from "@/lib/contenu/articles"

export const size = { width: 1200, height: 630 }
export const contentType = "image/png"
export const alt = "Article Radio Tripoint"

/** Carte de partage générée pour chaque article sans visuel. */
export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const a = await articleParSlug(slug)
  const titre = a?.titre ?? "Radio Tripoint"
  const rubrique = a ? categories[a.categorie].nom : "Actualités"
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: "#0b0e14",
        color: "#f2efe9",
        padding: 72,
        position: "relative",
      }}
    >
      <svg
        width="1200"
        height="630"
        viewBox="0 0 1200 630"
        style={{ position: "absolute", top: 0, left: 0 }}
      >
        <line x1="860" y1="300" x2="0" y2="300" stroke="#2a3244" strokeWidth="2" />
        <line x1="860" y1="300" x2="860" y2="0" stroke="#2a3244" strokeWidth="2" />
        <line x1="860" y1="300" x2="1200" y2="640" stroke="#2a3244" strokeWidth="2" />
        <circle cx="860" cy="300" r="10" fill="#8aa0ff" />
      </svg>
      <div
        style={{
          display: "flex",
          fontSize: 26,
          letterSpacing: 6,
          color: "#8aa0ff",
          textTransform: "uppercase",
        }}
      >
        {rubrique}
      </div>
      <div
        style={{
          display: "flex",
          fontSize: titre.length > 80 ? 54 : 66,
          fontWeight: 800,
          lineHeight: 1.05,
          letterSpacing: -2,
          maxWidth: 1000,
        }}
      >
        {titre}
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          fontSize: 28,
          fontWeight: 700,
          letterSpacing: 2,
        }}
      >
        RADIO TRIPOINT
        <span style={{ color: "#a7adb8", fontWeight: 400, marginLeft: 20, letterSpacing: 0 }}>
          France · Luxembourg · Allemagne
        </span>
      </div>
    </div>,
    size,
  )
}
