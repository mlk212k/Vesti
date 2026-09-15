import Link from "next/link";
import { FirstNamePrompt } from "@/components/dashboard/first-name-prompt";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PLANS, hasFeature, type Plan } from "@/lib/plans";
import { QuotaMeter } from "@/components/dashboard/quota-meter";
import { TodayCard } from "@/components/dashboard/today-card";
import { Button } from "@/components/ui/button";
import { Wordmark } from "@/components/brand/logo";
import type { QuotaStatus } from "@/types/db";

interface RecentAnalysis {
  id: string;
  score: number | null;
  occasion: string | null;
  created_at: string;
}

/**
 * L'accueil.
 *
 * ── Ce qui a été RETIRÉ, et pourquoi ────────────────────────────────────────
 *
 * Demande directe : « la page d'accueil est trop encombrante, y'a des boutons
 * il serve à rien comme les dernières tenues, le score, les analyses ».
 *
 * Sont partis :
 *
 *  - LES DEUX TUILES DE STATISTIQUES (« Analyses », « Score moyen »). Elles
 *    comptaient des actes sans jamais dire quoi en faire. Un score moyen de 68
 *    n'appelle aucune décision — et sur un compte neuf, elles affichaient deux
 *    cases vides, c'est-à-dire la promesse d'un tableau de bord qu'on n'a pas.
 *
 *  - LA LISTE DES TROIS DERNIÈRES TENUES. Elle doublait l'onglet Progrès, qui
 *    fait la même chose en mieux et en entier. Une page d'accueil qui recopie
 *    un onglet de la barre du bas ajoute une porte, pas une information.
 *
 * ── Ce qui reste, et pourquoi ───────────────────────────────────────────────
 *
 * Une page d'accueil d'application a UN travail : amener à l'action. Ici c'est
 * « analyser une tenue », et c'est tout. Le reste de l'écran lui laisse la
 * place au lieu de la lui disputer.
 *
 * Le quota descend en une ligne discrète sous le bouton plutôt que dans un
 * panneau à lui : c'est une contrainte à connaître, pas un sujet.
 *
 * La tenue du jour (plan Styliste) reste : elle donne une raison de revenir
 * demain, ce qu'aucune statistique ne fait.
 */
export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: quotaRows }, { data: analyses }, { data: locationRow }] =
    await Promise.all([
      supabase.rpc("get_quota_status"),
      supabase
        .from("analyses")
        .select("id, score, occasion, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("profiles")
        .select("latitude, first_name")
        .eq("id", user.id)
        .single<{ latitude: number | null; first_name: string | null }>(),
    ]);

  const quota = (quotaRows as QuotaStatus[] | null)?.[0];
  const plan: Plan = quota?.plan_code ?? "free";
  const definition = PLANS[plan];
  const recent = (analyses ?? []) as RecentAnalysis[];

  const exhausted = quota ? quota.remaining <= 0 : false;

  const firstName = locationRow?.first_name?.trim() || null;
  const greeting = recent.length === 0
    ? firstName
      ? `On commence, ${firstName} ?`
      : "On commence ?"
    : firstName
      ? `Content de te revoir, ${firstName}`
      : "Content de te revoir";

  return (
    <main className="flex flex-1 flex-col px-5 py-8">
      <header className="flex items-center justify-between">
        <Wordmark size={26} priority />
        {/* Le plan, en micro-libellé. Il était dans une pastille violette au
            sommet d'un panneau : beaucoup de bruit pour une information qu'on
            consulte une fois par mois. */}
        <span className="label text-muted">{definition.name}</span>
      </header>

      {/* Posée aux comptes créés avant que l'onboarding demande le prénom :
          cette étape ne se rejoue pas, donc sans cette carte ils n'auraient
          jamais l'occasion de répondre. */}
      {!firstName && (
        <div className="mt-8">
          <FirstNamePrompt />
        </div>
      )}

      {/*
        Le titre et l'action, séparés par du vide et rien d'autre.

        `flex-1` + `justify-center` : sur un écran vide — un compte neuf, le cas
        le plus fréquent aujourd'hui — l'ensemble se pose au milieu de la page
        au lieu de flotter en haut au-dessus d'un grand blanc. Sur un écran
        rempli, il reprend sa place en haut naturellement.
      */}
      <div className="flex flex-1 flex-col justify-center gap-8 py-10">
        <h1 className="text-[2.25rem] leading-[1.08]">{greeting}</h1>

        <div className="flex flex-col gap-3">
          {exhausted ? (
            <Link href="/billing">
              <Button>Passer en Pro pour continuer</Button>
            </Link>
          ) : (
            <Link href="/analyze">
              <Button>Analyser une tenue</Button>
            </Link>
          )}

          {quota && (
            <div className="flex flex-col gap-2">
              <QuotaMeter
                used={quota.used_count}
                limit={quota.limit_total}
                unlimited={definition.unlimitedMessaging}
              />
              <span className="label text-muted">
                Renouvelé le{" "}
                {new Date(quota.period_end).toLocaleDateString("fr-FR")}
              </span>
            </div>
          )}
        </div>
      </div>

      {hasFeature(plan, "shopping") && (
        <div className="pb-2">
          <TodayCard hasLocation={locationRow?.latitude !== null} />
        </div>
      )}

      {/* La seule invitation à payer de l'écran, et seulement pour qui a déjà
          analysé quelque chose : proposer un abonnement à quelqu'un qui n'a
          rien essayé ne convainc personne. */}
      {!hasFeature(plan, "history") && recent.length > 0 && (
        <section className="rule flex flex-col gap-3 pt-6">
          <h2 className="label text-muted">Garde une trace de tes progrès</h2>
          <p className="text-sm leading-relaxed text-muted">
            Le plan Pro conserve ta garde-robe, ton historique complet et
            l&apos;évolution de tes scores.
          </p>
          <Link href="/billing">
            <Button variant="secondary">Découvrir Pro</Button>
          </Link>
        </section>
      )}
    </main>
  );
}
