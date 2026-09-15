import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Analyzer } from "@/components/analyze/analyzer";
import { TrialSignup } from "@/components/landing/trial-signup";
import { Wordmark } from "@/components/brand/logo";

export const metadata = {
  title: "Essaie Vesti — une analyse offerte, sans compte",
  description:
    "Envoie une photo de ta tenue et reçois un avis argumenté. Sans inscription.",
};

/**
 * L'essai sans compte.
 *
 * ── Pourquoi cette page existe ──────────────────────────────────────────────
 *
 * Mesuré : 758 visiteurs sur la page d'accueil, 28 ont appuyé sur le bouton.
 * 3,7 %. Ceux qui franchissaient la marche allaient au bout — donc la perte
 * était avant l'inscription, pas dedans. On demandait un compte pour découvrir
 * ce que fait le produit.
 *
 * Ici, on analyse d'abord. Le compte se propose une fois le verdict lu, quand
 * la personne sait enfin ce qu'elle achèterait.
 *
 * ⚠️ CETTE PAGE COÛTE DE L'ARGENT À CHAQUE VISITE QUI VA AU BOUT : ~0,039 $ le
 * verdict, payé sans contrepartie. Les plafonds qui la protègent sont dans
 * `lib/anon-trial.ts` et comptés en SQL. Ne jamais l'ouvrir plus grand sans
 * regarder ce que la journée précédente a coûté.
 */
export default async function TrialPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Quelqu'un de déjà connecté n'a rien à faire ici : il a ses propres
  // analyses, avec son profil et sa garde-robe. Le laisser consommer un essai
  // gratuit lui donnerait un verdict MOINS bon que celui auquel il a droit.
  if (user) redirect("/dashboard");

  return (
    <main className="flex flex-1 flex-col gap-6 px-6 pb-10 pt-6">
      <div className="flex items-center justify-between gap-4">
        <Link href="/" aria-label="Vesti, accueil">
          <Wordmark size={26} priority />
        </Link>
        {/* La porte de sortie de qui a déjà un compte. Sans elle, la seule
            façon de se connecter depuis cette page serait de lancer un essai
            dont on n'a pas besoin. */}
        <Link href="/login" className="text-sm text-muted underline underline-offset-4">
          J&apos;ai déjà un compte
        </Link>
      </div>

      {/* Ce que la personne est en train de faire, rappelé une fois.
          Elle arrive d'un bouton qui promettait une analyse : le premier écran
          doit confirmer qu'il n'y a pas de formulaire caché derrière, sinon la
          moitié du bénéfice du changement est perdue avant la photo. */}
      <p className="text-sm leading-relaxed text-muted">
        Une analyse offerte, sans inscription. Ta photo sert à l&apos;analyse et
        à rien d&apos;autre.
      </p>

      <Analyzer mode="essai" afterVerdict={<TrialSignup />} />
    </main>
  );
}
