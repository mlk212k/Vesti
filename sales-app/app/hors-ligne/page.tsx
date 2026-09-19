import type { Metadata } from "next";
import { OndeNFC } from "@/components/nfc";

export const metadata: Metadata = { title: "Hors ligne" };

// Servie par le service worker quand le réseau manque. Volontairement sans
// données : afficher un chiffre d'affaires mis en cache hier, sans le dire,
// serait pire que de ne rien afficher.
export default function HorsLignePage() {
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center px-6 text-center">
      <OndeNFC taille={110} className="!static mb-6 !opacity-40" />
      <h1 className="titre text-3xl">Pas de réseau</h1>
      <p className="mt-3 max-w-xs text-sm text-dim">
        Tes ventes ne sont pas perdues : elles partent dès que la connexion
        revient. Cet écran ne montre aucun chiffre plutôt que de t&apos;en
        montrer un périmé.
      </p>
      {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- un
          <Link> ferait une navigation côté client, qui échouerait aussi sans
          réseau. Ici on veut un vrai rechargement : c'est ce qui teste la
          connexion. */}
      <a href="/" className="btn btn-primaire mt-7 px-7">
        Réessayer
      </a>
    </div>
  );
}
