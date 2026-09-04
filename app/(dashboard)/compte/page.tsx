import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PLANS, PLAN_COLUMNS, planOf, type PlanRow } from "@/lib/plans";
import { LEGAL_PAGES } from "@/lib/legal";
import { DangerZone } from "@/components/account/danger-zone";
import { ThemePicker } from "@/components/account/theme-picker";
import {
  SettingsGroup,
  SettingsLink,
  SettingsExternal,
  SettingsValue,
  SettingsCustom,
} from "@/components/settings/settings-list";
import { Button } from "@/components/ui/button";
import { getStyleStatus } from "@/lib/style.server";
import { formatCents } from "@/lib/referral/commission";
import { MORPHOLOGIES } from "@/lib/profile";
import { openNetworks, type SocialId } from "@/lib/community";
import {
  DiscordIcon,
  InstagramIcon,
  TikTokIcon,
} from "@/components/brand/social-icons";
import { LocationRow } from "@/components/settings/location-row";

/** Chaque réseau et son logo. Réunis ici pour qu'aucun n'arrive sans le sien. */
const SOCIAL_ICONS: Record<SocialId, React.ReactNode> = {
  discord: <DiscordIcon />,
  instagram: <InstagramIcon />,
  tiktok: <TikTokIcon />,
};

async function signOut() {
  "use server";
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

/**
 * Les réglages — l'onglet le plus à droite de la barre.
 *
 * C'était une page « Mon compte » atteinte par un petit bonhomme en haut à
 * droite de l'accueil, hors de portée du pouce, et qui empilait quatre cartes
 * sans lien entre elles. C'est maintenant un sommaire.
 *
 * ── La règle qui a construit cet écran ──────────────────────────────────────
 *
 * Une page de réglages se PARCOURT : on y cherche une chose précise, on ne la
 * lit pas. Donc chaque ligne annonce sa valeur actuelle à droite — le prénom, le
 * plan, le solde. Sans ça il faut ouvrir chaque écran pour savoir où l'on en
 * est, et un sommaire qui oblige à tout ouvrir n'est pas un sommaire.
 *
 * Ce qui se règle en un geste (le thème) reste ici. Ce qui demande un
 * formulaire part sur sa propre page, avec un retour explicite.
 */
export default async function ParametresPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select(`${PLAN_COLUMNS}, first_name, morphology, height_cm, latitude`)
    .eq("id", user.id)
    .single<
      PlanRow & {
        first_name: string | null;
        morphology: string | null;
        height_cm: number | null;
        latitude: number | null;
      }
    >();

  // Le plan affiché est le plan EFFECTIF, cadeau compris : la colonne `plan`
  // appartient à Stripe et reste sur « free » pendant six mois offerts. Afficher
  // celle-là ferait passer le cadeau pour un cadeau qui n'a pas marché.
  const plan = planOf(profile);
  const style = await getStyleStatus();

  const morphology = MORPHOLOGIES.find((m) => m.value === profile?.morphology);
  const networks = openNetworks();

  return (
    <main className="flex flex-1 flex-col gap-6 px-5 py-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-[1.9rem] font-extrabold leading-[1.05]">Paramètres</h1>
        <p className="truncate text-sm text-muted">{user.email}</p>
      </header>

      <SettingsGroup
        title="Toi"
        footnote="Ces informations changent les conseils : la même tenue ne se juge pas pareil selon la morphologie et les styles que tu aimes."
      >
        <SettingsLink
          href="/compte/profil"
          label="Profil et morphologie"
          value={profile?.first_name?.trim() || "À compléter"}
        />
        <SettingsValue
          label="Morphologie"
          value={morphology?.label ?? "Non renseignée"}
        />
        <SettingsValue
          label="Taille"
          value={profile?.height_cm ? `${profile.height_cm} cm` : "Non renseignée"}
        />
      </SettingsGroup>

      <SettingsGroup title="Abonnement">
        <SettingsLink
          href="/billing"
          label="Mon abonnement"
          value={PLANS[plan].name}
          hint="Changer de plan ou se désabonner"
        />
      </SettingsGroup>

      {style && (
        <SettingsGroup title="Parrainage">
          <SettingsLink
            href="/compte/parrainage"
            label="Mon code et mes gains"
            value={`${style.balance} Style`}
            hint={
              style.earningsCents > 0
                ? `${formatCents(style.earningsCents)} de commissions cumulées`
                : "Invite tes amis, gagne des mois offerts"
            }
          />
        </SettingsGroup>
      )}

      <SettingsGroup
        title="Apparence"
        footnote="« Système » suit le réglage clair/sombre de ton téléphone."
      >
        <SettingsCustom label="Thème">
          <ThemePicker />
        </SettingsCustom>
      </SettingsGroup>

      {/* ⚠️ Cette ligne affichait « Ville détectée », lue dans `profiles.city`.
          Or cette colonne n'est écrite NULLE PART dans le code — seulement lue.
          La ligne ne pouvait donc afficher que « Aucune », pour tout le monde et
          pour toujours. Ce qu'on sait réellement, c'est si une position est
          enregistrée : c'est ce qu'elle dit maintenant, et on peut l'activer
          d'ici au lieu d'aller la chercher sur l'accueil. */}
      <SettingsGroup
        title="Météo"
        footnote="Sert à adapter la tenue du jour au temps qu'il fait. La position est arrondie au kilomètre avant d'être enregistrée — jamais l'adresse exacte."
      >
        <LocationRow hasLocation={typeof profile?.latitude === "number"} />
      </SettingsGroup>

      {/* Le Discord est proposé à l'inscription, une fois, et l'étape ne se
          rejoue pas : sans ce groupe, celui qui a répondu « Plus tard » n'aurait
          plus jamais aucun moyen de retrouver le lien.

          Les réseaux sans adresse configurée ne sont PAS affichés — voir
          `openNetworks()`. Un lien vers un compte qui n'existe pas encore mène
          à « ce compte est introuvable », ce qui fait bien plus de mal qu'une
          ligne absente. */}
      {networks.length > 0 && (
        <SettingsGroup title="Réseaux">
          {networks.map((network) => (
            <SettingsExternal
              key={network.id}
              href={network.url}
              label={network.label}
              hint={network.hint}
              icon={SOCIAL_ICONS[network.id]}
            />
          ))}
        </SettingsGroup>
      )}

      <SettingsGroup title="Informations légales">
        {LEGAL_PAGES.map((page) => (
          <SettingsLink key={page.href} href={page.href} label={page.label} />
        ))}
      </SettingsGroup>

      <form action={signOut}>
        <Button variant="secondary" type="submit">
          Se déconnecter
        </Button>
      </form>

      {/* En dernier, et séparée : on ne supprime pas son compte par erreur en
          cherchant le thème. La distance fait partie de la protection. */}
      <DangerZone />
    </main>
  );
}
