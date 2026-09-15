import Link from "next/link";
import { buttonClasses } from "@/components/ui/button";
import { CheckIcon } from "@/components/ui/check-icon";

/**
 * Ce qu'on propose une fois l'essai rendu.
 *
 * ── Le moment ───────────────────────────────────────────────────────────────
 *
 * C'est ici, et nulle part avant. La personne vient de lire son verdict : elle
 * sait maintenant ce que fait le produit, et la question « est-ce que ça vaut
 * un compte » a enfin une réponse de son côté. Poser la question une seconde
 * plus tôt, c'était demander un engagement contre une promesse — ce que
 * mesuraient les 3,7 % de la page d'accueil.
 *
 * ⚠️ « GARDE CE VERDICT » N'EST PAS UNE FORMULE. L'essai est réellement recopié
 * dans le compte à l'inscription (`claim_anon_trial`). Si ce rattachement
 * venait à être retiré, cette phrase deviendrait un mensonge et il faudrait la
 * changer le même jour — c'est la seule promesse de cet écran.
 */
export function TrialSignup() {
  return (
    <section className="flex flex-col gap-4 rounded-[var(--radius-card)] bg-accent-soft p-5 text-accent-strong">
      <div className="flex flex-col gap-1.5">
        <span className="label">La suite est gratuite</span>
        <h2 className="text-[1.35rem] leading-[1.15]">
          Crée ton compte et garde ce verdict
        </h2>
      </div>

      <ul className="flex flex-col gap-2 text-sm leading-relaxed">
        <li className="flex gap-2">
          <CheckIcon />
          <span>Ce verdict rejoint ton historique.</span>
        </li>
        <li className="flex gap-2">
          <CheckIcon />
          <span>3 analyses offertes, sans carte bancaire.</span>
        </li>
        <li className="flex gap-2">
          <CheckIcon />
          {/* Vrai et vérifiable : le profil (morphologie, styles) entre dans le
              prompt d'analyse, ce que l'essai n'a pas. */}
          <span>Des conseils ajustés à ta morphologie et à tes styles.</span>
        </li>
      </ul>

      <Link href="/login" className={buttonClasses()}>
        Créer mon compte
      </Link>
    </section>
  );
}
