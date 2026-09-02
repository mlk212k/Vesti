import { NextResponse } from "next/server";
import { normalizeReferralCode } from "@/lib/navigation";

/**
 * Manifeste d'application installable — porteur du code de parrainage.
 *
 * ⚠️ C'est ici que se règle le problème le plus coûteux du parcours influenceur.
 *
 * Le lien `vesti.app/?ref=CODE` dépose le code dans un cookie. Mais sur iOS, une
 * app ajoutée à l'écran d'accueil a son PROPRE stockage, séparé de Safari : le
 * cookie posé dans le navigateur n'existe pas dans l'app installée. Comme le
 * parcours impose justement l'installation avant l'inscription, le code se
 * perdait systématiquement entre les deux — et l'influenceur n'était crédité
 * de personne.
 *
 * La solution passe par `start_url` : c'est l'adresse que le système enregistre
 * au moment de l'ajout à l'écran d'accueil, et celle qu'il ouvre ensuite. En y
 * inscrivant le code, le premier lancement depuis l'icône arrive avec `?ref=`
 * dans l'URL, et le proxy repose le cookie — cette fois du bon côté de la
 * cloison.
 *
 * Le manifeste est donc dynamique : une page visitée avec un code ne pointe pas
 * vers le même manifeste qu'une visite directe.
 */
export const dynamic = "force-dynamic";

export function GET(request: Request) {
  const ref = normalizeReferralCode(
    new URL(request.url).searchParams.get("ref") ?? ""
  );

  const start = ref ? `/dashboard?ref=${encodeURIComponent(ref)}` : "/dashboard";

  return NextResponse.json(
    {
      name: "Vesti — ton styliste personnel",
      short_name: "Vesti",
      description:
        "Envoie une photo de ta tenue, reçois un avis stylé et des conseils personnalisés.",
      start_url: start,
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
    },
    {
      headers: {
        "Content-Type": "application/manifest+json",
        // Jamais mis en cache par un intermédiaire : deux visiteurs venant de
        // deux influenceurs différents ne doivent pas partager un manifeste.
        "Cache-Control": "private, no-store",
      },
    }
  );
}
