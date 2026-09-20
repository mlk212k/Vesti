/**
 * Jeu de données de démonstration.
 *
 *   npm run seed
 *
 * Crée 1 admin, 1 manager (Malik) et 5 commerciaux, puis remplit une semaine
 * d'activité : stock, attributions, journées, commerces, ventes, messages.
 * Les dashboards sont ainsi lisibles dès la première connexion.
 *
 * Tout passe par les MÊMES fonctions SQL que l'application (`record_sale`,
 * `allocate_cards`, `start_work_day`…), en se connectant réellement avec
 * chaque compte. Conséquence : si une règle métier refuse quelque chose, le
 * seed échoue au lieu de fabriquer un état que l'app n'aurait jamais pu
 * produire — un jeu de démo incohérent est pire que pas de démo du tout.
 *
 * Nécessite dans .env.local :
 *   NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { readFileSync } from "node:fs";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { CONVERSATION_EQUIPE } from "../lib/chat.ts";

// -- Configuration ----------------------------------------------------------

function chargerEnv(): void {
  for (const fichier of [".env.local", ".env"]) {
    try {
      const contenu = readFileSync(new URL(`../${fichier}`, import.meta.url), "utf8");
      for (const ligne of contenu.split("\n")) {
        const trouve = ligne.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
        if (!trouve) continue;
        const [, cle, brut] = trouve;
        if (process.env[cle!]) continue;
        process.env[cle!] = brut!.replace(/^["']|["']$/g, "");
      }
    } catch {
      // Fichier absent : les variables viennent peut-être de l'environnement.
    }
  }
}

chargerEnv();

const URL_SUPABASE = process.env.NEXT_PUBLIC_SUPABASE_URL;
const CLE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const CLE_SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!URL_SUPABASE || !CLE_ANON || !CLE_SERVICE) {
  console.error(
    "Variables manquantes. Renseigne NEXT_PUBLIC_SUPABASE_URL, " +
      "NEXT_PUBLIC_SUPABASE_ANON_KEY et SUPABASE_SERVICE_ROLE_KEY dans .env.local.",
  );
  process.exit(1);
}

const admin = createClient(URL_SUPABASE, CLE_SERVICE, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const MOT_DE_PASSE = "Demo-2026!";

type Compte = {
  email: string;
  nom: string;
  role: "admin" | "manager" | "member";
  objectif?: number;
};

const COMPTES: Compte[] = [
  { email: "chef@demo.fr", nom: "Hicham Kaddouri", role: "admin" },
  { email: "malik@demo.fr", nom: "Malik Benali", role: "manager" },
  { email: "alex@demo.fr", nom: "Alex Moreau", role: "member" },
  { email: "thomas@demo.fr", nom: "Thomas Leroy", role: "member" },
  { email: "sarah@demo.fr", nom: "Sarah Nguyen", role: "member" },
  { email: "yanis@demo.fr", nom: "Yanis Cherif", role: "member", objectif: 12 },
  { email: "lea@demo.fr", nom: "Léa Dubois", role: "member" },
];

const COMMERCES = [
  { nom: "Boulangerie du Marché", type: "Boulangerie", ville: "Metz" },
  { nom: "Pizzeria Bella Nonna", type: "Restaurant", ville: "Metz" },
  { nom: "Garage Central Auto", type: "Garage", ville: "Woippy" },
  { nom: "Institut Belle Époque", type: "Esthétique", ville: "Thionville" },
  { nom: "Le Barbier de Metz", type: "Coiffure", ville: "Metz" },
  { nom: "Pharmacie des Tilleuls", type: "Pharmacie", ville: "Montigny" },
  { nom: "Kebab Istanbul", type: "Restauration rapide", ville: "Metz" },
  { nom: "Fleurs & Sens", type: "Fleuriste", ville: "Thionville" },
  { nom: "Cave Saint-Vincent", type: "Caviste", ville: "Metz" },
  { nom: "Sport Zone Fitness", type: "Salle de sport", ville: "Woippy" },
];

// -- Utilitaires ------------------------------------------------------------

function alea(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function piocher<T>(tableau: T[]): T {
  return tableau[alea(0, tableau.length - 1)]!;
}

async function connecter(email: string): Promise<SupabaseClient> {
  const client = createClient(URL_SUPABASE!, CLE_ANON!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error } = await client.auth.signInWithPassword({
    email,
    password: MOT_DE_PASSE,
  });
  if (error) throw new Error(`Connexion ${email} : ${error.message}`);
  return client;
}

async function rpc(
  client: SupabaseClient,
  nom: string,
  args: Record<string, unknown> = {},
): Promise<unknown> {
  const { data, error } = await client.rpc(nom, args);
  if (error) throw new Error(`${nom} : ${error.message}`);
  return data;
}

// -- Étapes -----------------------------------------------------------------

async function creerComptes(): Promise<Map<string, string>> {
  console.log("→ Comptes");
  const ids = new Map<string, string>();

  for (const compte of COMPTES) {
    const { data, error } = await admin.auth.admin.createUser({
      email: compte.email,
      password: MOT_DE_PASSE,
      email_confirm: true,
      user_metadata: { full_name: compte.nom },
    });

    let id = data?.user?.id;

    if (error) {
      if (!error.message.toLowerCase().includes("already")) throw error;
      // Le seed est rejouable : on retrouve le compte existant.
      const { data: liste } = await admin.auth.admin.listUsers({ perPage: 200 });
      id = liste?.users.find((u) => u.email === compte.email)?.id;
      if (!id) throw new Error(`Compte ${compte.email} introuvable`);
      console.log(`   ${compte.nom} (déjà présent)`);
    } else {
      console.log(`   ${compte.nom}`);
    }

    await admin
      .from("profiles")
      .update({
        full_name: compte.nom,
        role: compte.role,
        daily_goal_override: compte.objectif ?? null,
      })
      .eq("id", id!);

    ids.set(compte.email, id!);
  }

  return ids;
}

async function remplirStock(chef: SupabaseClient, ids: Map<string, string>) {
  console.log("→ Stock");
  await rpc(chef, "restock_cards", {
    p_quantity: 500,
    p_label: "Commande initiale",
    p_unit_cost_cents: 800,
  });

  for (const compte of COMPTES.filter((c) => c.role === "member")) {
    await rpc(chef, "allocate_cards", {
      p_member: ids.get(compte.email),
      p_quantity: 30,
      p_note: "Dotation de départ",
    });
  }
  console.log("   500 cartes au dépôt, 30 par commercial");
}

async function creerCommerces(client: SupabaseClient, memberId: string, nombre: number) {
  const fiches = [];
  for (let i = 0; i < nombre; i += 1) {
    const commerce = piocher(COMMERCES);
    fiches.push({
      member_id: memberId,
      name: `${commerce.nom}${i > 0 ? ` ${i + 1}` : ""}`,
      category: commerce.type,
      city: commerce.ville,
      address: `${alea(1, 80)} rue ${piocher(["des Lilas", "de la Gare", "Victor Hugo", "Nationale", "du Pont"])}`,
      contact_name: piocher(["Karim", "Sophie", "M. Bertrand", "Nadia", "Julien"]),
      phone: `06 ${alea(10, 99)} ${alea(10, 99)} ${alea(10, 99)} ${alea(10, 99)}`,
      status: piocher(["client", "client", "prospect", "callback", "refused"]),
      notes: piocher([
        "Très intéressé par les avis Google.",
        "Veut en reparler avec son associé.",
        "Déjà équipé chez un concurrent.",
        "Commande 5 cartes de plus le mois prochain.",
      ]),
    });
  }

  const { data, error } = await client
    .from("businesses")
    .insert(fiches)
    .select("id");
  if (error) throw new Error(`Commerces : ${error.message}`);
  return (data ?? []).map((row) => row.id as string);
}

async function jouerLaJournee(
  client: SupabaseClient,
  commerces: string[],
  ventes: number,
) {
  await rpc(client, "start_work_day");

  for (let i = 0; i < ventes; i += 1) {
    await rpc(client, "record_sale", {
      p_quantity: alea(1, 3),
      p_unit_price_cents: piocher([4000, 5000, 5000, 6000]),
      p_business: commerces.length > 0 ? piocher(commerces) : null,
      p_notes: null,
      p_photo_url: null,
      p_sold_at: null,
    });
  }
}

async function ecrireMessages(clients: Map<string, SupabaseClient>, ids: Map<string, string>) {
  console.log("→ Chat");
  const EQUIPE = CONVERSATION_EQUIPE;

  const echanges: [string, string][] = [
    ["chef@demo.fr", "Objectif de la semaine : 10 cartes par jour et par personne. On y va."],
    ["malik@demo.fr", "Secteur Metz centre pour Alex et Sarah, Thionville pour Thomas."],
    ["alex@demo.fr", "Bien reçu. Je commence par la rue Serpenoise."],
    ["sarah@demo.fr", "3 ventes avant midi 💪"],
    ["thomas@demo.fr", "Beaucoup de fermés côté Thionville, je bascule sur Woippy cet aprem."],
    ["chef@demo.fr", "Bon réflexe Thomas. Malik, tu valides les journées ce soir."],
  ];

  for (const [email, body] of echanges) {
    const client = clients.get(email)!;
    const { error } = await client.from("messages").insert({
      conversation_id: EQUIPE,
      author_id: ids.get(email),
      body,
    });
    if (error) throw new Error(`Message : ${error.message}`);
  }

  // Une conversation privée entre le manager et un commercial.
  const malik = clients.get("malik@demo.fr")!;
  const conversation = (await rpc(malik, "get_or_create_direct_conversation", {
    p_other: ids.get("thomas@demo.fr"),
  })) as string;

  await malik.from("messages").insert({
    conversation_id: conversation,
    author_id: ids.get("malik@demo.fr"),
    body: "Tu veux qu'on refasse le point sur ton argumentaire demain matin ?",
  });

  const thomas = clients.get("thomas@demo.fr")!;
  await thomas.from("messages").insert({
    conversation_id: conversation,
    author_id: ids.get("thomas@demo.fr"),
    body: "Avec plaisir, je bloque 9h.",
  });

  console.log(`   ${echanges.length + 2} messages`);
}

// -- Programme --------------------------------------------------------------

async function main() {
  console.log(`\nSeed de démonstration — ${URL_SUPABASE}\n`);

  const ids = await creerComptes();

  const clients = new Map<string, SupabaseClient>();
  for (const compte of COMPTES) {
    clients.set(compte.email, await connecter(compte.email));
  }

  const chef = clients.get("chef@demo.fr")!;

  // Paramètres : 10 % de commission, objectif 10 cartes, carte à 50 €.
  const { error: settingsError } = await chef
    .from("app_settings")
    .update({
      team_name: "ARENA",
      commission_rate_bp: 1000,
      default_daily_goal: 10,
      default_card_price_cents: 5000,
      missed_goal_penalty_cents: 0,
    })
    .eq("id", 1);
  if (settingsError) throw new Error(`Paramètres : ${settingsError.message}`);
  console.log("→ Paramètres : commission 10 %, objectif 10, carte 50 €");

  await remplirStock(chef, ids);

  console.log("→ Commerces et ventes");
  const membres = COMPTES.filter((c) => c.role === "member");

  for (const membre of membres) {
    const client = clients.get(membre.email)!;
    const commerces = await creerCommerces(client, ids.get(membre.email)!, alea(4, 7));

    // Une seule journée par personne et par date : la base l'impose
    // (`work_days_one_per_day`). Le seed joue donc la journée du jour, la
    // remplit, et laisse l'historique se construire à l'usage.
    const ventes = alea(3, 6);
    await jouerLaJournee(client, commerces, ventes);

    console.log(`   ${membre.nom} : ${commerces.length} commerces, ${ventes} ventes`);
  }

  // Thomas termine sa journée sans atteindre l'objectif : c'est le cas
  // « OBJECTIF NON ATTEINT » de la maquette, visible immédiatement.
  await rpc(clients.get("thomas@demo.fr")!, "end_work_day", {
    p_notes: "Secteur difficile, beaucoup de commerces fermés.",
  });
  console.log("   Thomas a terminé sa journée (objectif non atteint)");

  await ecrireMessages(clients, ids);

  console.log("\nTerminé.\n");
  console.log("Comptes de démonstration (mot de passe commun) :");
  for (const compte of COMPTES) {
    console.log(`  ${compte.role.padEnd(8)} ${compte.email.padEnd(18)} ${MOT_DE_PASSE}`);
  }
  console.log(
    "\n⚠️  Change ces mots de passe avant toute utilisation réelle.\n",
  );
}

main().catch((error: unknown) => {
  console.error("\nSeed interrompu :", error instanceof Error ? error.message : error);
  process.exit(1);
});
