import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { getSessionUser } from "@/lib/auth";

const clubName = process.env.NEXT_PUBLIC_CLUB_NAME ?? "US Guentrange";

export const metadata: Metadata = {
  title: "Le Club",
  description: `Histoire, couleurs et informations pratiques de l'${clubName}, club de football de Thionville depuis 1920.`,
};

export default async function ClubPage() {
  const user = await getSessionUser();

  return (
    <main className="min-h-screen">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-md items-center justify-between px-6 py-4 text-sm">
          <Link href="/" className="text-muted hover:text-foreground">
            ← Accueil
          </Link>
          {user ? (
            <Link
              href="/dashboard"
              className="rounded-md bg-accent px-3 py-1.5 font-medium text-white hover:bg-accent-strong"
            >
              Mon espace
            </Link>
          ) : (
            <Link
              href="/login"
              className="rounded-md border border-border bg-surface px-3 py-1.5 font-medium hover:bg-surface-2"
            >
              Se connecter
            </Link>
          )}
        </div>
      </header>

      <div className="mx-auto max-w-md px-6 py-12 space-y-12">
        <section className="text-center space-y-6">
          <Image
            src="/logo.jpg"
            alt={`Logo ${clubName}`}
            width={120}
            height={120}
            priority
            className="mx-auto rounded-full ring-2 ring-border shadow-lg"
          />
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.2em] text-muted">
              Union Sportive de Guentrange
            </p>
            <h1 className="text-3xl font-semibold tracking-tight">
              US Guentrange
            </h1>
            <p className="text-lg text-muted">
              Club de football de Thionville · Fondé en{" "}
              <span className="text-foreground font-medium">1920</span>
            </p>
          </div>
        </section>

        <section className="space-y-4">
          <SectionTitle>Le club en bref</SectionTitle>
          <div className="grid gap-3 grid-cols-2">
            <FactCard label="Fondation" value="1920" />
            <FactCard label="Couleurs" value="Rouge & blanc" />
            <FactCard label="Ville" value="Thionville (Moselle)" />
            <FactCard label="District" value="District mosellan de football" />
            <FactCard label="Équipes engagées" value="10 (saison 2025‑2026)" />
            <FactCard label="Catégories" value="Seniors D1 & D3 · U12 → U17" />
          </div>
        </section>

        <section className="space-y-4">
          <SectionTitle>Notre histoire</SectionTitle>
          <div className="space-y-4 text-[15px] leading-relaxed text-foreground/90">
            <p>
              Fondée en <strong>1920</strong>, l&apos;Union Sportive de
              Guentrange voit le jour au lendemain de la Première Guerre
              mondiale, dans les années où la Moselle redevient française. Le
              club prend le nom du quartier{" "}
              <strong>Guentrange</strong>, sur les hauteurs nord‑ouest de
              Thionville — un quartier lui‑même connu pour son
              <em> Fort de Guentrange</em>, ouvrage militaire allemand édifié
              entre 1899 et 1906 dans le cadre de la <em>Moselstellung</em>{" "}
              qui verrouillait alors la région.
            </p>
            <p>
              Depuis, le club vit au rythme du foot amateur mosellan&nbsp;: on
              y forme les enfants du quartier, on y aligne des équipes seniors
              chaque week‑end, on y transmet des générations de dirigeants
              bénévoles. Rouge et blanc, comme les couleurs du maillot et de
              l&apos;écusson.
            </p>
            <p>
              Le club est aujourd&apos;hui affilié à la{" "}
              <strong>Fédération Française de Football</strong> via le
              District mosellan et engage <strong>10 équipes</strong> pour la
              saison 2025‑2026 — des plus jeunes (U12) jusqu&apos;aux seniors,
              en Départemental 1 et Départemental 3.
            </p>
          </div>
        </section>

        <section className="space-y-4">
          <SectionTitle>Où nous trouver</SectionTitle>
          <div className="rounded-lg border border-border bg-surface p-5 space-y-3">
            <div>
              <div className="text-xs uppercase tracking-wide text-muted">
                Adresse
              </div>
              <div className="mt-1">
                7 rue de la Sportive
                <br />
                57100 Thionville
              </div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-muted">
                Terrains
              </div>
              <div className="mt-1">
                Stade omnisports de Guentrange, Chemin du Kem, Thionville
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <SectionTitle>Rejoindre le club</SectionTitle>
          <p className="text-sm text-muted">
            Créer un compte membre te donne accès au calendrier des matchs et
            entraînements, aux annonces du staff, à l&apos;annuaire et au chat
            de l&apos;équipe.
          </p>
          <div className="flex flex-wrap gap-3">
            {user ? (
              <Link
                href="/dashboard"
                className="rounded-lg bg-accent px-4 py-2 font-medium text-white hover:bg-accent-strong"
              >
                Ouvrir mon espace
              </Link>
            ) : (
              <>
                <Link
                  href="/login?mode=signup"
                  className="rounded-lg bg-accent px-4 py-2 font-medium text-white hover:bg-accent-strong"
                >
                  Créer un compte
                </Link>
                <Link
                  href="/login"
                  className="rounded-lg border border-border bg-surface px-4 py-2 font-medium hover:bg-surface-2"
                >
                  Se connecter
                </Link>
              </>
            )}
          </div>
        </section>

        <footer className="border-t border-border pt-6 text-xs text-muted">
          <p>
            Informations rassemblées à partir de sources publiques (FFF /
            District mosellan, ville de Thionville, Wikipédia). Une correction
            à apporter&nbsp;? Contacte un administrateur du club depuis
            l&apos;espace membres.
          </p>
        </footer>
      </div>
    </main>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xl font-semibold tracking-tight border-b border-border pb-2">
      {children}
    </h2>
  );
}

function FactCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface px-4 py-3">
      <div className="text-xs uppercase tracking-wide text-muted">{label}</div>
      <div className="mt-1 font-medium">{value}</div>
    </div>
  );
}
