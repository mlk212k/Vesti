import type { Metadata, Viewport } from "next"
import { Archivo, Newsreader } from "next/font/google"
import { BandeauDemo } from "@/components/layout/BandeauDemo"
import { Footer } from "@/components/layout/Footer"
import { Header } from "@/components/layout/Header"
import { scriptTheme } from "@/components/layout/ThemeToggle"
import { LecteurBarre } from "@/components/radio/LecteurBarre"
import { Consentement } from "@/components/rgpd/Consentement"
import { JsonLd } from "@/components/ui/JsonLd"
import { site } from "@/config/site"
import { listerEmissions } from "@/lib/contenu/emissions"
import { versGrille } from "@/lib/radio/types"
import { jsonLdOrganisation } from "@/lib/seo/jsonld"
import "./globals.css"

const archivo = Archivo({
  subsets: ["latin"],
  axes: ["wdth"],
  variable: "--font-archivo",
  display: "swap",
})

// Serif de presse : textes longs, sous la ligne de flottaison. Pas de
// préchargement, pour laisser la bande passante aux titres (LCP).
const newsreader = Newsreader({
  subsets: ["latin"],
  variable: "--font-newsreader",
  display: "swap",
  preload: false,
})

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: "Radio Tripoint — Radio transfrontalière France, Luxembourg, Allemagne",
    template: "%s | Radio Tripoint",
  },
  description: site.description,
  applicationName: site.nomOfficiel,
  keywords: [
    "Radio Tripoint",
    "radio Sierck-les-Bains",
    "radio Trois Frontières",
    "radio transfrontalière",
    "radio Moselle",
    "actualités Trois Frontières",
    "Schengen",
    "Perl",
    "Apach",
  ],
  authors: [{ name: site.nomOfficiel, url: site.url }],
  publisher: site.nomOfficiel,
  formatDetection: { telephone: false, address: false, email: false },
  openGraph: {
    type: "website",
    locale: "fr_FR",
    siteName: site.nomOfficiel,
    url: "/",
    title: "Radio Tripoint — La radio qui fait vibrer les Trois Frontières",
    description: site.description,
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: "/" },
  appleWebApp: { capable: true, title: "Radio Tripoint", statusBarStyle: "black-translucent" },
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafaf7" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const grille = versGrille(await listerEmissions())
  return (
    <html
      lang="fr"
      className={`${archivo.variable} ${newsreader.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: scriptTheme }} />
      </head>
      <body>
        <a
          href="#contenu"
          className="bg-encre text-papier sr-only z-50 px-4 py-3 font-semibold focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
        >
          Aller au contenu
        </a>
        <BandeauDemo />
        <Header />
        <main id="contenu" tabIndex={-1} className="outline-none">
          {children}
        </main>
        <Footer />
        <LecteurBarre grille={grille} />
        <Consentement />
        <JsonLd data={jsonLdOrganisation()} />
      </body>
    </html>
  )
}
