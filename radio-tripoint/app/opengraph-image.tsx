import { ImageResponse } from "next/og"
import { logoDataUrl } from "@/lib/seo/logo-og"

export const size = { width: 1200, height: 630 }
export const contentType = "image/png"
export const alt = "Radio Tripoint — La radio transfrontalière"

export default async function Image() {
  const logo = await logoDataUrl()
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        background: "#0a0a0a",
        color: "#fafaf7",
        padding: 72,
        gap: 64,
      }}
    >
      <img src={logo} width={430} height={430} alt="" style={{ borderRadius: 9999 }} />
      <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            fontSize: 70,
            fontWeight: 800,
            lineHeight: 1,
            letterSpacing: -2,
          }}
        >
          <span>La radio qui fait vibrer</span>
          <span style={{ color: "#f9b800" }}>les Trois Frontières.</span>
        </div>
        <div style={{ display: "flex", marginTop: 36, fontSize: 30, color: "#a9a8a2" }}>
          France · Allemagne · Luxembourg
        </div>
      </div>
    </div>,
    size,
  )
}
