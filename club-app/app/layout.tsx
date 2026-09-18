import type { Metadata, Viewport } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import Script from "next/script";
import { InstallGate } from "@/components/install-gate";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-ui",
  display: "swap",
});

// Runs before hydration so an already-installed user never sees the
// install gate flash on open — it tags <html> synchronously, and
// globals.css hides .install-gate based on that class alone.
const detectStandaloneScript = `(function(){try{var s=window.matchMedia&&window.matchMedia('(display-mode: standalone)').matches;var i=window.navigator&&window.navigator.standalone===true;if(s||i){document.documentElement.classList.add('pwa-installed');}}catch(e){}})();`;

const clubName = process.env.NEXT_PUBLIC_CLUB_NAME ?? "US Guentrange";

export const metadata: Metadata = {
  title: {
    default: clubName,
    template: `%s · ${clubName}`,
  },
  description: `L'app du ${clubName} : membres, calendrier, annonces et messagerie.`,
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: clubName,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#e11d2e",
  colorScheme: "light",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="fr"
      className={`${spaceGrotesk.variable} ${inter.variable}`}
      suppressHydrationWarning
    >
      <body>
        <Script
          id="detect-standalone"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: detectStandaloneScript }}
        />
        <div className="pate pate-a" aria-hidden="true" />
        <div className="pate pate-b" aria-hidden="true" />
        <InstallGate />
        {children}
      </body>
    </html>
  );
}
