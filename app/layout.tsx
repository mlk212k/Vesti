import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { REFERRAL_COOKIE } from "@/proxy";
import { normalizeReferralCode } from "@/lib/navigation";
import { THEME_SCRIPT } from "@/lib/theme";
import { Bricolage_Grotesque, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { InstallGate } from "@/components/install/install-gate";

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
export async function generateMetadata(): Promise<Metadata> {
  const ref = (await cookies()).get(REFERRAL_COOKIE)?.value;
  const code = normalizeReferralCode(ref ?? "");

  return {
    title: "Vesti — ton styliste personnel",
    description:
      "Envoie une photo de ta tenue, reçois un avis stylé et des conseils personnalisés.",
    manifest: code
      ? `/manifest.webmanifest?ref=${encodeURIComponent(code)}`
      : "/manifest.webmanifest",
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
      </body>
    </html>
  );
}
