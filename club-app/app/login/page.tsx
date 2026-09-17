import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { LoginForm } from "./login-form";

type Search = { mode?: string; next?: string };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const { mode, next } = await searchParams;
  const isSignUp = mode === "signup";

  const user = await getSessionUser();
  if (user) redirect(next && next.startsWith("/") ? next : "/dashboard");

  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <Link
            href="/"
            className="inline-block text-xs uppercase tracking-wide text-muted hover:text-foreground"
          >
            ← Retour
          </Link>
          <h1 className="text-2xl font-semibold">
            {isSignUp ? "Créer ton compte" : "Se connecter"}
          </h1>
          <p className="text-sm text-muted">
            {isSignUp
              ? "Rejoins l'équipe pour accéder au calendrier et au chat."
              : "Accède à l'espace membre du club."}
          </p>
        </div>

        <LoginForm isSignUp={isSignUp} next={next} />

        <p className="text-center text-sm text-muted">
          {isSignUp ? (
            <>
              Déjà membre&nbsp;?{" "}
              <Link
                href={{ pathname: "/login", query: next ? { next } : {} }}
                className="text-accent hover:underline"
              >
                Se connecter
              </Link>
            </>
          ) : (
            <>
              Pas encore de compte&nbsp;?{" "}
              <Link
                href={{
                  pathname: "/login",
                  query: { mode: "signup", ...(next ? { next } : {}) },
                }}
                className="text-accent hover:underline"
              >
                S&apos;inscrire
              </Link>
            </>
          )}
        </p>
      </div>
    </main>
  );
}
