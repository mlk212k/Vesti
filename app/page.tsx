import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LegalLinks } from "@/components/legal-links";
import { Wordmark } from "@/components/brand/logo";
import { buttonClasses } from "@/components/ui/button";
import { VerdictPreview } from "@/components/landing/verdict-preview";

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
    <main className="flex flex-1 flex-col gap-5 px-6 pb-8 pt-6">
      <Wordmark size={28} priority className="self-start" />

      <div className="flex flex-col gap-3">
        {/* Coupes explicites : deux lignes, la chute en violet. Laissé au
            navigateur, le titre casse après « 30 » et sépare le chiffre de son
            unité.

            ⚠️ Le titre est passé de 2,45 à 2,05 rem et de trois lignes à deux :
            avec l'aperçu de verdict ajouté en dessous, le bouton d'appel
            tombait sous la ligne de flottaison. Un titre plus gros qui pousse
            le bouton hors de l'écran coûte plus qu'il ne rapporte. */}
        {/* ⚠️ L'espace entre « 30 » et « secondes » est INSÉCABLE. Sans lui, la
            ligne casse pile entre le chiffre et son unité — le défaut que le
            découpage manuel d'origine existait pour éviter, et que le passage à
            deux lignes avait réintroduit. Vu à l'écran. */}
        <h1 className="text-[2.05rem] leading-[1.04]">
          Ta tenue, jugée en{" "}
          <span className="text-accent">30&nbsp;secondes.</span>
        </h1>
        <p className="max-w-[36ch] text-[15px] leading-relaxed text-muted">
          Envoie une photo, reçois un avis argumenté — et quoi changer.
        </p>
      </div>

      {/*
        ⚠️ ICI SE TROUVAIT LE LOGO EN 148 px, AVEC SON HALO. Il est parti, et ce
        n'est pas un arbitrage de goût.

        Mesuré sur huit jours : 758 visiteurs sur cette page, 28 ont appuyé sur
        le bouton. 3,7 %. Ceux qui passent vont au bout — 57 % de `/login`
        arrivent dans l'app — donc la perte est ici, pas à l'inscription.

        Un logo de 148 px ne dit rien à quelqu'un qui arrive de TikTok : il ne
        connaît pas la marque, c'est un disque violet. Il occupait la moitié de
        l'écran du seul écran où il fallait montrer ce que fait le produit. La
        place revient donc au verdict, qui est la seule réponse à la question
        que se pose le visiteur : « ça rend quoi, concrètement ? »

        Le wordmark en haut porte la marque, et il suffit.
      */}
      <VerdictPreview />

      <div className="mt-auto flex flex-col gap-3">
        <Link href="/login" className={buttonClasses()}>
          Analyser ma tenue
        </Link>
        <p className="text-center text-xs text-muted">
          3 analyses offertes, sans carte bancaire.
        </p>
      </div>

      <LegalLinks />
    </main>
  );
}
