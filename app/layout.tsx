import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { REFERRAL_COOKIE } from "@/proxy";
import { normalizeReferralCode } from "@/lib/navigation";
import { THEME_SCRIPT } from "@/lib/theme";
import { Bricolage_Grotesque, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { InstallGate } from "@/components/install/install-gate";
import { env } from "@/lib/env";
import { Analytics } from "@vercel/analytics/next";

/* Titres : graisses lourdes, largeur variable — l'écho typographique des traits
   épais du logo. `display: swap` pour ne jamais bloquer le premier rendu. */
const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  display: "swap",
});

/* Texte courant : plus ouverte, pensée pour les petites tailles sur mobile. */
const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  display: "swap",
});

/**
 * Le lien vers le manifeste porte le code de parrainage quand il y en a un.
 *
 * C'est ce lien que le système lit au moment d'« Ajouter à l'écran d'accueil » :
 * en y glissant le code, l'icône installée s'ouvrira sur une URL qui le
 * contient, et le proxy pourra reposer le cookie DANS l'app — là où celui du
 * navigateur n'arrive pas. Voir `app/manifest.webmanifest/route.ts`.
 */
const TITLE = "Vesti — ton styliste personnel";
const DESCRIPTION =
  "Envoie une photo de ta tenue, reçois un avis stylé et des conseils personnalisés.";

export async function generateMetadata(): Promise<Metadata> {
  const ref = (await cookies()).get(REFERRAL_COOKIE)?.value;
  const code = normalizeReferralCode(ref ?? "");

  return {
    title: TITLE,
    description: DESCRIPTION,
    manifest: code
      ? `/manifest.webmanifest?ref=${encodeURIComponent(code)}`
      : "/manifest.webmanifest",

    /*
      L'aperçu du lien quand on le partage.

      ⚠️ Sans ces trois blocs, `vesti8.app` collé sur Discord, en message ou
      dans une bio n'affiche qu'un texte nu : pas d'image, pas de bandeau. Un
      lien sans aperçu, à côté de dix liens qui en ont un, ne se lit pas comme
      sobre — il se lit comme douteux, et c'est le tout premier contact avec
      l'app pour quelqu'un qui vient de TikTok.

      `metadataBase` est obligatoire dès qu'une image est donnée en chemin
      relatif : sans elle, Next refuse de construire l'URL absolue que les
      réseaux exigent. Elle vient de la configuration, jamais d'un domaine
      écrit à la main — c'est le défaut qu'on vient de corriger ailleurs.
    */
    metadataBase: new URL(env.siteUrl),
    openGraph: {
      type: "website",
      siteName: env.siteName,
      locale: "fr_FR",
      url: "/",
      title: TITLE,
      description: DESCRIPTION,
      images: [
        {
          url: "/og.png",
          width: 1200,
          height: 630,
          alt: "Vesti — ta tenue, notée et expliquée en 30 secondes.",
        },
      ],
    },
    twitter: {
      // `summary_large_image` : la grande image. Sans ce mot, X et plusieurs
      // messageries affichent une vignette carrée de 120 px, où le texte de
      // l'image devient illisible.
      card: "summary_large_image",
      title: TITLE,
      description: DESCRIPTION,
      images: ["/og.png"],
    },
  };
}

export const viewport: Viewport = {
  themeColor: "#7931fb",
  // Le trafic vient de TikTok : on cadre le rendu mobile dès le départ.
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="fr"
      className={`${bricolage.variable} ${jakarta.variable} h-full`}
      // Le script ci-dessous modifie cet élément avant que React ne s'y
      // attache : sans cette annotation, React signalerait un écart entre le
      // HTML du serveur et celui du navigateur.
      suppressHydrationWarning
    >
      <head>
        {/* Applique le thème choisi AVANT le premier rendu. Fait après, la page
            s'afficherait dans le thème du système puis basculerait — un éclair
            blanc à chaque ouverture pour qui a choisi le sombre. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-full font-sans antialiased">
        <div className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col">
          {/* Rien du tunnel ne s'affiche tant que l'app n'est pas ouverte
              depuis l'écran d'accueil. Voir components/install/install-gate. */}
          <InstallGate>{children}</InstallGate>
        </div>
        <Analytics />
      </body>
    </html>
  );
}
