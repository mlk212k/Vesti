import type { MetadataRoute } from "next";

const appName = process.env.NEXT_PUBLIC_APP_NAME ?? "ARENA";

// Manifeste PWA : les commerciaux installent l'app sur leur écran d'accueil
// et l'ouvrent en plein écran, sans barre d'URL. `display: standalone` est ce
// qui fait la différence entre « un site » et « une app » dans la main.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${appName} · équipe commerciale`,
    short_name: appName,
    description:
      "Cartes NFC, journées de travail, ventes et commissions de l'équipe.",
    start_url: "/",
    display: "standalone",
    background_color: "#2a2124",
    theme_color: "#2a2124",
    orientation: "portrait",
    lang: "fr",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icon-192-maskable.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icon-512-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
