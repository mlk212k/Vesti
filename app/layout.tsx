import type { Metadata, Viewport } from "next";
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
    <html lang="fr" className={`${bricolage.variable} ${jakarta.variable} h-full`}>
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
