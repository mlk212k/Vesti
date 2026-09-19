import type { Metadata, Viewport } from "next";
import { Archivo, Inter } from "next/font/google";
import { EnregistreServiceWorker } from "@/components/pwa";
import "./globals.css";

// Archivo : grotesque très grasse, excellente en capitales serrées — c'est
// elle qui porte les titres et les gros chiffres. Inter : la lisibilité
// tranquille pour tout le reste. Deux familles, deux rôles, pas plus.
const archivo = Archivo({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["600", "700", "800", "900"],
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
  themeColor: "#07070a",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className={`${archivo.variable} ${inter.variable}`}>
      <body className="min-h-screen bg-ink text-text antialiased">
        {/* Les deux halos vivent ici, sous toutes les pages : la profondeur
            est une propriété du document, pas de chaque écran. */}
        <div className="halo halo-violet" aria-hidden="true" />
        <div className="halo halo-magenta" aria-hidden="true" />
        <div className="grille" aria-hidden="true" />
        <div className="scanline" aria-hidden="true" />
        <div className="relative z-10">{children}</div>
        <EnregistreServiceWorker />
      </body>
    </html>
  );
}
