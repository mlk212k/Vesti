import type { Metadata, Viewport } from "next";
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

export const metadata: Metadata = {
  title: "Vesti — ton styliste personnel",
  description:
    "Envoie une photo de ta tenue, reçois un avis stylé et des conseils personnalisés.",
};

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
