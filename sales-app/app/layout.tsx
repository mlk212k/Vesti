import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Plus_Jakarta_Sans } from "next/font/google";
import { EnregistreServiceWorker } from "@/components/pwa";
import "./globals.css";

// Deux polices, et plus une seule ligne de monospace.
//
//   Bricolage Grotesque — large, un peu de travers, éditoriale. C'est de
//   l'affiche de quartier, pas du logiciel. Elle ne sert qu'aux grands mots
//   et aux chiffres.
//
//   Plus Jakarta Sans — ronde, chaleureuse, très lisible. Elle porte TOUT
//   le reste, y compris ce qui était avant en capitales monospace de 10 px :
//   les étiquettes sont maintenant des phrases écrites normalement.
//
// Le monospace a disparu volontairement. Il donnait à l'app un air de
// terminal ou de site de paris ; les chiffres gardent la chasse tabulaire,
// ce qui suffit à ce qu'une colonne de montants ne danse pas.
const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const jakarta = Plus_Jakarta_Sans({
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
      className={`${bricolage.variable} ${jakarta.variable}`}
    >
      <body className="min-h-screen bg-nuit text-craie antialiased">
        {/* Les deux lavis flous qui dérivent derrière la page, pêche en
            haut, lilas en bas. C'est ce qui empêche le fond d'être un aplat
            de noir mort. */}
        <div className="lampe" aria-hidden="true" />
        <div className="relative z-10">{children}</div>
        <EnregistreServiceWorker />
      </body>
    </html>
  );
}
