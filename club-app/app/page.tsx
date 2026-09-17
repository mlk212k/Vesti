import Image from "next/image";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth";

const clubName = process.env.NEXT_PUBLIC_CLUB_NAME ?? "US Guentrange";

export default async function LandingPage() {
  const user = await getSessionUser();

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 py-16">
      <div className="w-full max-w-sm space-y-8 text-center">
        <Image
          src="/logo.jpg"
          alt={`Logo ${clubName}`}
          width={112}
          height={112}
          priority
          className="mx-auto rounded-full ring-1 ring-border"
        />

        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-[11px] uppercase tracking-wide text-muted">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" />
          Thionville · depuis 1920
        </div>

        <h1 className="text-3xl font-semibold tracking-tight">{clubName}</h1>

        <p className="text-[15px] leading-relaxed text-muted">
          L&apos;espace membres du club&nbsp;: annuaire, calendrier, annonces
          et messagerie.
        </p>

        <div className="space-y-2.5 pt-2">
          {user ? (
            <Link
              href="/dashboard"
              className="block w-full rounded-xl bg-accent px-5 py-3 font-medium text-white transition hover:bg-accent-strong"
            >
              Ouvrir mon espace
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="block w-full rounded-xl bg-accent px-5 py-3 font-medium text-white transition hover:bg-accent-strong"
              >
                Se connecter
              </Link>
              <Link
                href="/login?mode=signup"
                className="block w-full rounded-xl border border-border bg-surface px-5 py-3 font-medium transition hover:bg-surface-2"
              >
                Créer un compte
              </Link>
            </>
          )}
        </div>

        <Link
          href="/club"
          className="inline-block text-sm text-muted underline-offset-4 hover:text-foreground hover:underline"
        >
          Découvrir le club →
        </Link>
      </div>
    </main>
  );
}
