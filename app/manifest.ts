import type { MetadataRoute } from "next";

/**
 * Manifeste d'application installable.
 *
 * Le trafic vient de TikTok : l'app s'ouvre dans un navigateur in-app, et
 * « Ajouter à l'écran d'accueil » est le seul chemin de réengagement gratuit.
 * L'icône « maskable » est une variante distincte du logo, redimensionnée dans
 * le cercle de sécurité de 80 % — sinon Android rogne le disque violet.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Vesti — ton styliste personnel",
    short_name: "Vesti",
    description:
      "Envoie une photo de ta tenue, reçois un avis stylé et des conseils personnalisés.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#f7f5fd",
    theme_color: "#7931fb",
    lang: "fr",
    icons: [
      { src: "/logo.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/logo-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
