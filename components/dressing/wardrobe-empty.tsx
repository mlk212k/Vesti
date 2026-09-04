import Link from "next/link";
import { Button } from "@/components/ui/button";
import { buttonClasses } from "@/components/ui/button";
import { WeatherPill } from "./weather-pill";

/**
 * Ce que voit quelqu'un dont la garde-robe est vide — c'est-à-dire tout le
 * monde au début, et longtemps.
 *
 * L'écran précédent posait un bouton et rien d'autre. Un bouton ne dit pas ce
 * qu'on gagne à appuyer dessus, et « scanner son dressing » est un effort réel :
 * il faut aller photographier ses vêtements. Personne ne le fait sans savoir ce
 * que ça débloque, d'où les trois promesses — elles ne décrivent pas la
 * fonctionnalité, elles décrivent le service rendu.
 *
 * Deux chemins, parce qu'ils n'ont pas le même coût : scanner remplit vite mais
 * demande une session dédiée ; analyser une tenue ne coûte rien de plus que ce
 * qu'on faisait déjà, et remplit au fil de l'eau.
 */
const PROMISES = [
  {
    title: "Des tenues avec ce que tu as déjà",
    body: "Vesti compose à partir de tes vraies pièces, pas d'un catalogue.",
    icon: HangerIcon,
  },
  {
    title: "Ce qui te manque, repéré",
    body: "Une pièce qui débloquerait cinq tenues vaut mieux qu'une de plus.",
    icon: GapIcon,
  },
  {
    title: "La tenue du jour",
    body: "Selon la météo et ton programme, choisie dans ta penderie.",
    icon: SunIcon,
  },
];

/**
 * ⚠️ `canScan` n'est pas un détail d'affichage : sans lui, l'action PRINCIPALE
 * de cet écran envoyait le plan Découverte sur « Scanner ma penderie », qui lui
 * répond « passe en Pro ». Une garde-robe vide dont le seul gros bouton est un
 * mur de paiement, c'est le meilleur moyen de faire fermer l'app. Pour lui,
 * c'est l'analyse de tenue qui devient le chemin — elle est comprise dans son
 * offre, et c'est elle qui remplit sa garde-robe.
 */
export function WardrobeEmpty({
  weather,
  canScan,
}: {
  weather: boolean;
  canScan: boolean;
}) {
  return (
    <main className="flex flex-1 flex-col gap-7 px-5 py-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-[1.9rem] font-extrabold leading-[1.05]">Ta garde-robe</h1>
        <p className="text-sm leading-relaxed text-muted">
          Elle est vide pour l&apos;instant. Une fois remplie, Vesti travaille
          avec tes vêtements plutôt qu&apos;en général.
        </p>
      </header>

      {/* La météo s'affiche même sans garde-robe : elle montre concrètement ce
          que remplir sa penderie débloquerait, au lieu de le promettre. */}
      {weather && <WeatherPill hasWardrobe={false} />}

      <ul className="flex flex-col gap-3">
        {PROMISES.map(({ title, body, icon: Icon }) => (
          <li
            key={title}
            className="flex gap-3 rounded-[var(--radius-card)] border border-border-soft bg-surface p-4"
          >
            <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-accent-soft text-accent-strong">
              <Icon />
            </span>
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-semibold">{title}</span>
              <span className="text-xs leading-relaxed text-muted">{body}</span>
            </div>
          </li>
        ))}
      </ul>

      {canScan ? (
        <>
          <div className="flex flex-col gap-2">
            <Link href="/dressing/scan" className={buttonClasses("primary")}>
              Scanner ma penderie
            </Link>
            <p className="text-center text-xs leading-relaxed text-muted">
              Quelques photos de tes vêtements suffisent — étalés sur un lit, ou
              suspendus.
            </p>
          </div>

          <div className="flex flex-col gap-2 border-t border-border-soft pt-5">
            <span className="text-sm font-semibold">Ou sans rien faire de plus</span>
            <p className="text-xs leading-relaxed text-muted">
              Chaque tenue que tu analyses dépose ses pièces ici, une par une.
              C&apos;est plus lent, mais tu n&apos;as rien à photographier en plus.
            </p>
            <Link href="/analyze">
              <Button variant="secondary">Analyser une tenue</Button>
            </Link>
          </div>
        </>
      ) : (
        <>
          <div className="flex flex-col gap-2">
            <Link href="/analyze" className={buttonClasses("primary")}>
              Analyser une tenue
            </Link>
            <p className="text-center text-xs leading-relaxed text-muted">
              Chaque tenue analysée dépose ses pièces ici. C&apos;est compris dans
              ton offre, tu n&apos;as rien à photographier en plus.
            </p>
          </div>

          <div className="flex flex-col gap-2 border-t border-border-soft pt-5">
            <span className="text-sm font-semibold">Ou beaucoup plus vite</span>
            <p className="text-xs leading-relaxed text-muted">
              Le scan photographie toute ta penderie d&apos;un coup, au lieu
              d&apos;une tenue à la fois. Il est compris dans les plans payants.
            </p>
            <Link href="/billing">
              <Button variant="secondary">Voir les plans</Button>
            </Link>
          </div>
        </>
      )}
    </main>
  );
}

/* Icônes au trait, comme la barre d'onglets et le logo : bouts ronds, angles
   adoucis, une seule épaisseur. */
const props = {
  width: 20,
  height: 20,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function HangerIcon() {
  return (
    <svg {...props}>
      <path d="M12 9.6V8.2a2.3 2.3 0 1 1 2.3-2.3" />
      <path d="M12 9.6 4.2 16.1a1.5 1.5 0 0 0 .96 2.65h13.68a1.5 1.5 0 0 0 .96-2.65L12 9.6Z" />
    </svg>
  );
}

function GapIcon() {
  return (
    <svg {...props}>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
      <circle cx="12" cy="12" r="9" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg {...props}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.2 5.2l1.4 1.4M17.4 17.4l1.4 1.4M18.8 5.2l-1.4 1.4M6.6 17.4l-1.4 1.4" />
    </svg>
  );
}
