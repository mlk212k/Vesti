import type { Metadata, Viewport } from "next";
import { Archivo, Inter_Tight, JetBrains_Mono } from "next/font/google";
import { EnregistreServiceWorker } from "@/components/pwa";
import "./globals.css";

// Deux voix, et c'est l'écart entre elles qui fait l'identité.
//
//   Archivo, poussée à « wdth » 125 / « wght » 900 — large, massive, énergie
//   d'affiche et de signalétique urbaine. Elle ne sert qu'aux très grands
//   mots. En paragraphe elle serait illisible ; c'est voulu, elle n'y va
//   jamais.
//
//   JetBrains Mono — la voix machine : libellés, heures, identifiants, en
//   très petit et très espacé. Chasse fixe, donc un montant qui change ne
//   décale jamais la colonne voisine.
//
//   Inter Tight — le texte courant, celui qu'on lit vraiment. Neutre au
//   point de disparaître, ce qui est exactement son travail ici.
//
// Archivo est une police variable : on demande explicitement l'axe de
// largeur, sans quoi « wdth » n'aurait aucun effet et les titres
// resteraient à la largeur normale.
const archivo = Archivo({
  subsets: ["latin"],
  variable: "--font-display",
  axes: ["wdth"],
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500", "700"],
  display: "swap",
});

const inter = Inter_Tight({
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
      className={`${archivo.variable} ${mono.variable} ${inter.variable}`}
    >
      <body className="min-h-screen bg-vide text-os antialiased">
        {/* La source de lumière unique de l'app. Elle dérive très
            lentement : c'est elle qui donne une direction d'éclairage, donc
            un volume, à tout ce qui est posé au-dessus. */}
        <div className="lampe" aria-hidden="true" />
        <div className="relative z-10">{children}</div>
        <EnregistreServiceWorker />
      </body>
    </html>
  );
}
