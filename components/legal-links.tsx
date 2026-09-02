import Link from "next/link";
import { LEGAL_PAGES } from "@/lib/legal";

/**
 * Les mentions légales et les CGV doivent être accessibles depuis la page
 * d'accueil et, surtout, avant tout paiement.
 */
export function LegalLinks({ className = "" }: { className?: string }) {
  return (
    <nav className={`flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-muted ${className}`}>
      {LEGAL_PAGES.map((page) => (
        <Link key={page.href} href={page.href} className="underline underline-offset-2">
          {page.label}
        </Link>
      ))}
    </nav>
  );
}
