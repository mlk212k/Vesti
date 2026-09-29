import { ImageResponse } from "next/og"

export const size = { width: 1200, height: 630 }
export const contentType = "image/png"
export const alt = "Radio Tripoint — La radio qui fait vibrer les Trois Frontières"

export default function Image() {
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
        <line x1="900" y1="330" x2="0" y2="330" stroke="#2a3244" strokeWidth="2" />
        <line x1="900" y1="330" x2="900" y2="0" stroke="#2a3244" strokeWidth="2" />
        <line x1="900" y1="330" x2="1200" y2="630" stroke="#2a3244" strokeWidth="2" />
        <circle cx="900" cy="330" r="12" fill="#8aa0ff" />
      </svg>
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ fontSize: 24, letterSpacing: 8, color: "#a7adb8" }}>RADIO</div>
        <div style={{ fontSize: 64, fontWeight: 800, letterSpacing: -1 }}>TRIPOINT</div>
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          fontSize: 76,
          fontWeight: 800,
          lineHeight: 1,
          letterSpacing: -2,
        }}
      >
        <span>La radio qui fait vibrer</span>
        <span style={{ color: "#8aa0ff" }}>les Trois Frontières.</span>
      </div>
      <div style={{ display: "flex", fontSize: 28, color: "#a7adb8" }}>
        France · Luxembourg · Allemagne
      </div>
    </div>,
    size,
  )
}
