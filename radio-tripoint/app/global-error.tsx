"use client"

/** Dernier filet : l'erreur a emporté le layout. Styles en ligne, aucune dépendance. */
export default function GlobalError({
  retry,
}: {
  error: Error & { digest?: string }
  retry: () => void
}) {
  return (
    <html lang="fr">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "#0a0a0a",
          color: "#fafaf7",
          fontFamily: "system-ui, sans-serif",
          padding: 24,
        }}
      >
        <main style={{ maxWidth: 560 }}>
          <p
            style={{
              letterSpacing: "0.14em",
              fontSize: 12,
              fontWeight: 700,
              color: "#f9b800",
              textTransform: "uppercase",
            }}
          >
            Radio Tripoint
          </p>
          <h1 style={{ fontSize: 40, lineHeight: 1.05, margin: "16px 0" }}>
            Le site est momentanément indisponible.
          </h1>
          <p style={{ color: "#a9a8a2", fontSize: 18 }}>Réessayez dans un instant.</p>
          <button
            onClick={() => retry()}
            style={{
              marginTop: 24,
              padding: "12px 22px",
              background: "#fafaf7",
              color: "#0a0a0a",
              border: 0,
              borderRadius: 4,
              fontWeight: 700,
              fontSize: 16,
              cursor: "pointer",
            }}
          >
            Réessayer
          </button>
        </main>
      </body>
    </html>
  )
}
