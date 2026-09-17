import Image from "next/image";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth";

const clubName = process.env.NEXT_PUBLIC_CLUB_NAME ?? "US Guentrange";

export default async function LandingPage() {
  const user = await getSessionUser();

  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-16">
      <div className="max-w-xl w-full text-center space-y-8">
        <Image
          src="/logo.jpg"
          alt={`Logo ${clubName}`}
          width={140}
          height={140}
          priority
          className="mx-auto rounded-full ring-2 ring-border shadow-lg"
        />

        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs uppercase tracking-wide text-muted">
          <span className="h-2 w-2 rounded-full bg-accent" />
          Club de football · Thionville · depuis 1920
        </div>

        <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight">
          {clubName}
        </h1>

        <p className="text-muted text-lg leading-relaxed">
          L&apos;espace membres du club&nbsp;: annuaire, calendrier des matchs
          et entraînements, annonces et messagerie interne.
        </p>

        <div>
          <Link
            href="/club"
            className="text-sm text-muted hover:text-foreground underline underline-offset-4"
          >
            Découvrir le club →
          </Link>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          {user ? (
            <Link
              href="/dashboard"
              className="w-full sm:w-auto rounded-lg bg-accent px-5 py-2.5 font-medium text-black hover:bg-accent-strong transition"
            >
              Ouvrir mon espace
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="w-full sm:w-auto rounded-lg bg-accent px-5 py-2.5 font-medium text-black hover:bg-accent-strong transition"
              >
                Se connecter
              </Link>
              <Link
                href="/login?mode=signup"
                className="w-full sm:w-auto rounded-lg border border-border bg-surface px-5 py-2.5 font-medium hover:bg-surface-2 transition"
              >
                Créer un compte
              </Link>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
