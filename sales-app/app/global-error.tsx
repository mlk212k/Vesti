"use client";

// Filet de sécurité de dernier recours : une erreur survenue dans la mise en
// page racine remplace tout le document, `<html>` compris. On ne peut donc
// s'appuyer sur aucun style de l'app — tout est écrit en ligne.
export default function ErreurGlobale({ reset }: { reset: () => void }) {
  return (
    <html lang="fr">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1.5rem",
          background: "#2a2124",
          color: "#f6f0e9",
          fontFamily: "system-ui, sans-serif",
          textAlign: "center",
          padding: "2rem",
        }}
      >
        <p style={{ fontSize: "1.5rem", fontWeight: 700, margin: 0 }}>Ça a coincé</p>
        <p style={{ margin: 0, color: "#b6aaa2" }}>
          Recharge l&apos;application, tes données sont intactes.
        </p>
        <button
          type="button"
          onClick={reset}
          style={{
            border: "none",
            borderRadius: 999,
            padding: "0.9rem 1.6rem",
            background: "#ffc93c",
            color: "#2b1c00",
            fontSize: "1rem",
            fontWeight: 700,
          }}
        >
          Réessayer
        </button>
      </body>
    </html>
  );
}
