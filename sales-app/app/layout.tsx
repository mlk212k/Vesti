import type { Metadata, Viewport } from "next";
import { Bagel_Fat_One, Plus_Jakarta_Sans } from "next/font/google";
import { Fond } from "@/components/fond";
import { EnregistreServiceWorker } from "@/components/pwa";
import "./globals.css";

// Deux polices, et plus une seule ligne de monospace.
//
//   Bagel Fat One — une lettre BULLE. Gonflée, ronde, les contrepoints
//   presque refermés, comme peinte à la bombe puis remplie. C'est le
//   lettrage des pochettes de mixtape et des t-shirts du début des années
//   2000 — dessiné à la main, pas construit à la règle.
//
//   Plus Jakarta Sans — ronde, chaleureuse, très lisible. Elle porte TOUT
//   le reste.
//
// Unbounded est partie, et c'est le cœur de la correction. Elle est large,
// grasse et impeccablement géométrique : construite au compas. Sur un écran
// déjà chromé, elle tirait toute la direction vers la MACHINE — Tron, le
// lecteur MP3, le générique de film de science-fiction. Or le Y2K de la rue
// n'est pas géométrique : il est gonflé, manuel, un peu bancal. C'est la
// différence entre un logo de constructeur automobile et un tag.
//
// Le monospace, lui, ne revient pas. Il donnait à l'app un air de terminal
// ou de site de paris ; les chiffres gardent la chasse tabulaire, ce qui
// suffit à ce qu'une colonne de montants ne danse pas.
const bagel = Bagel_Fat_One({
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
  themeColor: "#0b0809",
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
      className={`${bagel.variable} ${jakarta.variable}`}
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
