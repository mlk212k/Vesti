import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LegalLinks } from "@/components/legal-links";
import { LogoMark, Wordmark } from "@/components/brand/logo";
import { buttonClasses } from "@/components/ui/button";

/**
 * Le premier écran après un lien TikTok. Le logo y est joué en grand : c'est la
 * seule page où l'on peut se permettre un aplat violet plein cadre, et c'est ce
 * qui fait le lien avec la vignette de la vidéo d'où vient le visiteur.
 */
export default async function LandingPage() {
  /**
   * Un utilisateur connecté n'a rien à faire sur la page de vente.
   *
   * ⚠️ Ce renvoi manquait, et ça se voyait surtout dans l'app installée : sur
   * iPhone, si l'icône a été ajoutée depuis cette page, elle ouvre `/` et non
   * `/dashboard` — le `start_url` du manifeste n'est pas toujours appliqué par
   * iOS. On retombait donc sur « Ta tenue, jugée en 30 secondes » à chaque
   * lancement, en étant parfaitement connecté, avec l'impression que la
   * connexion n'avait pas pris.
   *
   * Corriger le manifeste n'aurait rien réglé pour les icônes DÉJÀ installées :
   * leur adresse de départ est figée au moment de l'ajout. Le renvoi, lui,
   * fonctionne quelle que soit la porte d'entrée.
   */
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) redirect("/dashboard");

  return (
    <main className="flex flex-1 flex-col px-6 pb-10 pt-8">
      <Wordmark size={30} priority className="self-start" />

      <div className="flex flex-1 flex-col justify-center gap-9 py-10">
        <div className="relative flex justify-center">
          {/* Halo : le violet du logo, diffusé, pour asseoir le disque sans
              ajouter de cadre autour. */}
          <div
            aria-hidden
            className="absolute inset-0 m-auto h-52 w-52 rounded-full bg-accent/25 blur-3xl"
          />
          <LogoMark size={148} priority className="relative drop-shadow-xl" />
        </div>

        <div className="flex flex-col gap-4 text-center">
          {/* Coupes explicites : trois lignes équilibrées, la chute en violet.
              Laissé au navigateur, le titre casse après « 30 » et sépare le
              chiffre de son unité. */}
          <h1 className="text-[2.45rem] font-extrabold leading-[1.02]">
            Ta tenue,
            <br />
            jugée en
            <br />
            <span className="text-accent">30 secondes.</span>
          </h1>
          <p className="mx-auto max-w-[32ch] text-[15px] leading-relaxed text-muted">
            Envoie une photo. Reçois un avis argumenté sur les couleurs, les
            coupes et la cohérence — et quoi changer.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <Link href="/login" className={buttonClasses()}>
          Analyser ma tenue
        </Link>
        <p className="text-center text-xs text-muted">
          3 analyses offertes, sans carte bancaire.
        </p>
      </div>

      <LegalLinks className="mt-8" />
    </main>
  );
}
