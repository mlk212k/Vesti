import type { MetadataRoute } from "next";

const clubName = process.env.NEXT_PUBLIC_CLUB_NAME ?? "US Guentrange";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: clubName,
    short_name: clubName,
    description: `L'app du ${clubName} : membres, calendrier, annonces et messagerie.`,
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#e11d2e",
    lang: "fr",
    categories: ["sports", "social"],
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
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
