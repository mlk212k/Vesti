import type { Metadata } from "next";
import "./globals.css";

const clubName = process.env.NEXT_PUBLIC_CLUB_NAME ?? "US Guentrange";

export const metadata: Metadata = {
  title: {
    default: clubName,
    template: `%s · ${clubName}`,
  },
  description: `L'app du ${clubName} : membres, calendrier, annonces et messagerie.`,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
