import type { Metadata, Viewport } from "next";
import { Bebas_Neue, Inter, JetBrains_Mono } from "next/font/google";
import { EnregistreServiceWorker } from "@/components/pwa";
import "./globals.css";

// Trois voix, trois rôles :
//
//   Bebas Neue — capitales condensées, une seule graisse. C'est l'affiche
//   collée sur un mur. Réservée aux titres : illisible en paragraphe.
//
//   JetBrains Mono — tous les chiffres et toutes les étiquettes. Chasse
//   fixe, donc un montant qui change ne décale jamais la colonne voisine, et
//   l'œil lit « compté » plutôt que « écrit ».
//
//   Inter — le texte courant. Personne ne lit une note de commerce en
//   condensé.
const bebas = Bebas_Neue({
  subsets: ["latin"],
  variable: "--font-display",
  weight: "400",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["500", "700", "800"],
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-ui",
  display: "swap",
});

const appName = process.env.NEXT_PUBLIC_APP_NAME ?? "ARENA";

export const metadata: Metadata = {
  title: {
    default: appName,
    template: `%s · ${appName}`,
  },
  description:
    "Pilotage de l'équipe commerciale : cartes NFC, journées, ventes, commissions.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: appName,
  },
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  // `cover` est ce qui fait exister env(safe-area-inset-*) : sans lui, la
  // barre du bas passe sous l'indicateur d'accueil de l'iPhone.
  viewportFit: "cover",
  themeColor: "#0a0a0b",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="fr"
      className={`${bebas.variable} ${mono.variable} ${inter.variable}`}
    >
      <body className="min-h-screen bg-noir text-os antialiased">
        {/* La lampe au-dessus de l'établi : une seule source, très sourde.
            La trame de points et le grain viennent de globals.css. */}
        <div className="lampe" aria-hidden="true" />
        <div className="relative z-10">{children}</div>
        <EnregistreServiceWorker />
      </body>
    </html>
  );
}
