import type { Metadata, Viewport } from "next";
import { Lilita_One, Plus_Jakarta_Sans } from "next/font/google";
import { Fond } from "@/components/fond";
import { EnregistreServiceWorker } from "@/components/pwa";
import "./globals.css";

// Deux polices, et plus une seule ligne de monospace.
//
//   Lilita One — une lettre d'AFFICHE. Grasse, légèrement condensée,
//   les terminaisons coupées net. C'est le lettrage des maillots, des
//   panneaux de kermesse et des pochettes — dessiné pour être lu de loin et
//   en travers, pas pour être élégant de près.
//
//   Elle règle au passage un problème concret : les montants s'affichent
//   jusqu'à 7 rem de haut. Une lettre large faisait déborder « 1 240 € » sur
//   un écran étroit ; une condensée tient.
//
const lilita = Lilita_One({
  subsets: ["latin"],
  weight: "400",
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
  themeColor: "#2a2124",
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
      className={`${lilita.variable} ${jakarta.variable}`}
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
