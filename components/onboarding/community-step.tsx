import Link from "next/link";
import { buttonClasses } from "@/components/ui/button";
import { DISCORD_INVITE_URL } from "@/lib/community";

/**
 * Dernière étape de l'inscription : le Discord.
 *
 * ── Pourquoi ici, et pourquoi en dernier ────────────────────────────────────
 *
 * En dernier parce que le profil est déjà enregistré à ce stade : quoi qu'il
 * arrive ensuite — un tap sur Discord, une app qui s'ouvre, un retour qui ne se
 * fait jamais — le compte est créé et rien n'est perdu. Placée avant, cette
 * étape aurait fait sortir de Vesti au milieu d'un formulaire non sauvegardé.
 *
 * ⚠️ « Plus tard » n'est pas une politesse. Le bouton Discord quitte l'app :
 * sans porte de sortie ici, quelqu'un qui n'a pas Discord — ou n'en veut pas —
 * resterait bloqué sur le dernier écran de son inscription.
 */
export function CommunityStep() {
  return (
    <div className="flex flex-col gap-7">
      <div className="flex flex-col gap-3">
        <DiscordMark />
        <h1 className="text-[1.9rem] font-extrabold leading-[1.05]">
          Rejoins la communauté
        </h1>
        <p className="text-sm leading-relaxed text-muted">
          Le Discord de Vesti, c&apos;est là qu&apos;on partage ses tenues avant
          de sortir, qu&apos;on demande un deuxième avis, et qu&apos;on apprend
          les nouveautés en premier.
        </p>
      </div>

      <ul className="flex flex-col gap-3">
        <Perk title="Un avis humain">
          Le styliste note ta tenue en trente secondes. La communauté, elle, te
          dit ce qu&apos;elle en penserait vraiment.
        </Perk>
        <Perk title="Les nouveautés en avance">
          Les fonctionnalités s&apos;y annoncent, et s&apos;y décident souvent.
        </Perk>
        <Perk title="Les bons plans">
          Les pièces trouvées par les autres, les soldes repérées à temps.
        </Perk>
      </ul>

      <div className="flex flex-col gap-2">
        {/*
          Un lien, pas un bouton avec du JavaScript.

          ⚠️ Sur téléphone, `discord.gg` est un lien universel : le système
          reconnaît l'adresse et ouvre l'APPLICATION Discord directement, sans
          passer par une page web. Une navigation déclenchée en JavaScript perd
          souvent ce traitement et retombe sur le navigateur — plus lent, et
          l'utilisateur doit se reconnecter.

          `target="_blank"` parce que Vesti tourne en app installée : sans lui,
          Discord remplacerait l'app dans la même fenêtre et le retour se ferait
          sur une inscription qu'on croirait perdue. `rel` va avec, toujours :
          sans `noopener`, la page ouverte garde une prise sur celle-ci.
        */}
        <a
          href={DISCORD_INVITE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonClasses()}
          style={{ touchAction: "manipulation" }}
        >
          <DiscordGlyph />
          Rejoindre le Discord
        </a>

        <Link href="/dashboard" className={buttonClasses("ghost")}>
          Plus tard
        </Link>
      </div>

      <p className="text-center text-xs leading-relaxed text-muted">
        Tu retrouveras le lien à tout moment dans Paramètres.
      </p>
    </div>
  );
}

function Perk({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-3 rounded-[var(--radius-control)] border border-border-soft bg-surface px-4 py-3">
      <span className="mt-1.5 h-1.5 w-1.5 flex-none rounded-full bg-accent" aria-hidden />
      <span className="flex flex-col gap-0.5">
        <span className="text-sm font-semibold">{title}</span>
        <span className="text-xs leading-relaxed text-muted">{children}</span>
      </span>
    </li>
  );
}

/** Le logo Discord, dans sa pastille. Reconnaissable avant d'être lu. */
function DiscordMark() {
  return (
    <span
      className="flex h-14 w-14 items-center justify-center rounded-[var(--radius-card)] bg-accent-soft text-accent-strong"
      aria-hidden
    >
      <DiscordGlyph size={30} />
    </span>
  );
}

/**
 * La manette de Discord, redessinée en aplat.
 *
 * Un aplat et non des traits, contrairement aux icônes de la barre du bas : ce
 * n'est pas une icône de l'app, c'est une marque tierce. On la reconnaît à sa
 * silhouette pleine, et la redessiner « à la manière de Vesti » la rendrait
 * méconnaissable — c'est-à-dire inutile.
 */
function DiscordGlyph({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <path d="M19.3 5.6a16.5 16.5 0 0 0-4.1-1.3l-.2.4a15 15 0 0 1 3.6 1.2 12.7 12.7 0 0 0-10.9 0 15 15 0 0 1 3.6-1.2l-.2-.4a16.5 16.5 0 0 0-4.1 1.3C4 9.4 3.3 13.1 3.6 16.7a16.7 16.7 0 0 0 5 2.5l.6-1a11 11 0 0 1-1.9-.9l.3-.3a11.9 11.9 0 0 0 10 0l.3.3c-.6.4-1.2.7-1.9.9l.6 1a16.6 16.6 0 0 0 5-2.5c.4-4.2-.6-7.9-2.3-11.1ZM9.4 14.5c-1 0-1.8-.9-1.8-2s.8-2 1.8-2 1.8.9 1.8 2-.8 2-1.8 2Zm5.2 0c-1 0-1.8-.9-1.8-2s.8-2 1.8-2 1.8.9 1.8 2-.8 2-1.8 2Z" />
    </svg>
  );
}
