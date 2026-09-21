import type { Metadata, Viewport } from "next";
import { Unbounded, Space_Grotesk } from "next/font/google";
import { Fond } from "@/components/fond";
import { EnregistreServiceWorker } from "@/components/pwa";
import "./globals.css";

// Deux polices, et plus une seule ligne de monospace.
//
//   Unbounded — très large, très grasse, les contrepoints presque fermés.
//   C'est la lettre des pochettes et des logos du début des années 2000,
//   celle qui va avec du chrome. Elle ne sert qu'aux grands mots et aux
//   chiffres, parce qu'elle est illisible en petit et que c'est très bien
//   comme ça.
//
//   Space Grotesk — ses chiffres ont une vraie tête, ses `a` et ses `g`
//   aussi, et elle reste parfaitement lisible à 14 px. Elle porte TOUT le
//   reste.
//
// Bricolage Grotesque et Plus Jakarta Sans sont parties : correctes toutes
// les deux, mais neutres — de la typographie de logiciel bien élevé. Cette
// direction demande de la lettre qui a un accent.
//
// Le monospace, lui, ne revient pas. Il donnait à l'app un air de terminal
// ou de site de paris ; les chiffres gardent la chasse tabulaire, ce qui
// suffit à ce qu'une colonne de montants ne danse pas.
const unbounded = Unbounded({
  subsets: ["latin"],
  weight: ["600", "800"],
  variable: "--font-display",
  display: "swap",
});

const space = Space_Grotesk({
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
  themeColor: "#100e12",
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
      className={`${unbounded.variable} ${space.variable}`}
    >
      <body className="min-h-screen bg-nuit text-craie antialiased">
        {/* Le décor animé : brumes à l'aérographe, treillis de chrome,
            ondes NFC, vernis iridescent. Entièrement en CSS — pas un octet
            de JavaScript, et tout s'éteint avec `prefers-reduced-motion`. */}
        <Fond />
        <div className="relative z-10">{children}</div>
        <EnregistreServiceWorker />
      </body>
    </html>
  );
}
