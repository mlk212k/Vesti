import Link from "next/link";
import { Logo } from "@/components/logo";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <Logo className="h-12 w-12" />
      <p className="chiffre mt-6 text-7xl text-faint">404</p>
      <h1 className="titre mt-2 text-2xl">Rien par ici</h1>
      <p className="mt-2 max-w-xs text-sm text-dim">
        Cette page n&apos;existe pas — ou elle ne te concerne pas. Les données
        des autres membres ne sont pas accessibles, même en changeant l&apos;URL.
      </p>
      <Link href="/" className="btn btn-primaire mt-6 px-6">
        Retour au tableau de bord
      </Link>
    </div>
  );
}
