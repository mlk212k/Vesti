import type { MetadataRoute } from "next"
import { site } from "@/config/site"

/** PWA légère : installable sur l'écran d'accueil, sans service worker ni cache hors ligne. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: site.nomOfficiel,
    short_name: "Radio Tripoint",
    description: site.description,
    lang: "fr",
    start_url: "/?source=pwa",
    display: "standalone",
    background_color: "#0b0e14",
    theme_color: "#0b0e14",
    categories: ["news", "music", "entertainment"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Émissions", url: "/emissions" },
      { name: "Actualités", url: "/actualites" },
      { name: "Podcasts", url: "/podcasts" },
    ],
  }
}
