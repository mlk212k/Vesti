import Link from "next/link";
import { LoginForm } from "./login-form";
import { safeNext } from "@/lib/navigation";
import { LogoMark } from "@/components/brand/logo";

// Ces deux erreurs ne viennent que du retour Google : la connexion par mot de
// passe et la récupération par code se font sans quitter l'app.
const ERRORS: Record<string, string> = {
  connexion_invalide: "La connexion a été interrompue. Réessaie.",
  connexion_expiree: "Cette tentative a expiré. Réessaie.",
};

export default async function LoginPage(props: PageProps<"/login">) {
  const params = await props.searchParams;
  const rawNext = typeof params.next === "string" ? params.next : undefined;
  const rawError = typeof params.error === "string" ? params.error : undefined;
  const errorMessage = rawError ? ERRORS[rawError] : undefined;

  return (
    <main className="flex flex-1 flex-col justify-center gap-8 px-6 py-10">
      <div className="flex flex-col items-center gap-3 text-center">
        <Link href="/" aria-label="Vesti, accueil">
          <LogoMark size={64} priority />
        </Link>
        <h1 className="text-[1.85rem] font-extrabold leading-tight">
          Ton styliste personnel
        </h1>
        <p className="max-w-[30ch] text-sm leading-relaxed text-muted">
          Connecte-toi pour recevoir ton premier avis en 30 secondes.
        </p>
      </div>

      {errorMessage && (
        <p className="rounded-2xl border border-danger/25 bg-danger-soft px-4 py-3 text-center text-sm text-danger">
          {errorMessage}
        </p>
      )}

      <LoginForm next={safeNext(rawNext)} />

      <p className="text-center text-xs leading-relaxed text-muted">
        En continuant, tu acceptes que tes photos servent uniquement à générer
        tes conseils.
      </p>
    </main>
  );
}
