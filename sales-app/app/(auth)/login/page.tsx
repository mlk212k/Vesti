import type { Metadata } from "next";
import { Marque } from "@/components/logo";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Connexion" };

const appName = process.env.NEXT_PUBLIC_APP_NAME ?? "ARENA";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <div className="montee">
      <div className="mb-8 flex flex-col items-center gap-3 text-center">
        <Marque nom={appName} />
        <p className="surtitre">Équipe commerciale · cartes NFC</p>
      </div>

      <div className="panneau diagonale entaille p-6">
        <h1 className="titre mb-1 text-2xl">Connexion</h1>
        <p className="mb-6 text-sm text-dim">
          Les comptes sont créés par le chef. Pas de compte&nbsp;? Demande-lui.
        </p>
        <LoginForm next={next} />
      </div>
    </div>
  );
}
