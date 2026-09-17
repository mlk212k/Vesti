import Link from "next/link";
import { getSessionUser } from "@/lib/auth";

const clubName = process.env.NEXT_PUBLIC_CLUB_NAME ?? "Mon Club";

export default async function LandingPage() {
  const user = await getSessionUser();

  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-16">
      <div className="max-w-xl w-full text-center space-y-8">
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs uppercase tracking-wide text-muted">
          <span className="h-2 w-2 rounded-full bg-accent" />
          Club sportif
        </div>

        <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight">
          {clubName}
        </h1>

        <p className="text-muted text-lg leading-relaxed">
          Toute la vie du club au même endroit&nbsp;: liste des membres,
          calendrier des matchs et entraînements, annonces, messagerie
          interne.
        </p>

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
