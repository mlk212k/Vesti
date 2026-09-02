import type { ReactNode } from "react";
import Link from "next/link";
import { LEGAL_PAGES, missingLegalFields } from "@/lib/legal";
import { Wordmark } from "@/components/brand/logo";

export default function LegalLayout({ children }: { children: ReactNode }) {
  const missing = missingLegalFields();

  return (
    <div className="flex min-h-dvh flex-1 flex-col px-5 py-8">
      <Link href="/" className="mb-8 self-start">
        <Wordmark size={26} />
      </Link>

      {missing.length > 0 && (
        // Visible en développement comme en production : mieux vaut un bandeau
        // gênant qu'un site qui semble en règle sans l'être.
        <p className="mb-6 rounded-2xl border border-danger/30 bg-danger/5 p-4 text-xs leading-relaxed text-danger">
          <strong>À compléter avant mise en ligne.</strong> Champs manquants dans{" "}
          <code>lib/legal.ts</code> : {missing.join(", ")}.
        </p>
      )}

      <article className="flex flex-col gap-5 text-sm leading-relaxed">{children}</article>

      <nav className="mt-10 flex flex-wrap gap-x-4 gap-y-2 border-t border-border pt-5 text-xs text-muted">
        <Link href="/" className="underline underline-offset-2">
          Accueil
        </Link>
        {LEGAL_PAGES.map((page) => (
          <Link key={page.href} href={page.href} className="underline underline-offset-2">
            {page.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
