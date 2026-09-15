import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { env } from "@/lib/env";

/**
 * Rafraîchit la session Supabase à chaque requête et garde les routes privées.
 *
 * En Next.js 16 ce fichier s'appelle `proxy.ts` (l'ancien nom `middleware.ts`
 * est déprécié) et la fonction exportée doit s'appeler `proxy`.
 *
 * Ici on ne fait QUE de l'authentification. La vérification « onboarding
 * terminé ? » est faite dans app/(dashboard)/layout.tsx, qui charge déjà le
 * profil : la refaire ici coûterait une requête base à chaque requête HTTP,
 * y compris sur les assets.
 */

/** Routes nécessitant une session. */
const PROTECTED_PREFIXES = [
  "/dashboard",
  "/analyze",
  "/dressing",
  "/history",
  "/shopping",
  "/billing",
  // Les paramètres sont un onglet à part entière depuis qu'ils ont remplacé
  // « Analyser » dans la barre. Le garde du layout les couvrait déjà, mais un
  // visiteur sans session traversait tout le rendu serveur avant d'être renvoyé.
  "/compte",
  "/onboarding",
  // L'accès admin lui-même est contrôlé par email dans app/admin/layout.tsx ;
  // ici on évite simplement qu'un visiteur anonyme atteigne la route.
  "/admin",
];

/** Routes réservées aux visiteurs non connectés. */
const GUEST_ONLY_PREFIXES = ["/login"];

/** Code influenceur capté depuis l'URL, en attendant l'onboarding. */
export const REFERRAL_COOKIE = "vesti_ref";

function matches(pathname: string, prefixes: string[]): boolean {
  return prefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

/**
 * Ramène toute navigation sur le domaine canonique, ou `null` s'il n'y a rien
 * à faire.
 *
 * ── Le bug que ça répare, en entier ─────────────────────────────────────────
 *
 * Une inscription Google a créé un compte sans jamais créer de session :
 * `auth.identities` portait bien l'identité Google, `auth.sessions` était vide,
 * et la personne se retrouvait sur la page de vente en croyant s'être
 * connectée. Le compte existait, donc réessayer ne « réparait » rien.
 *
 * La chaîne, relevée dans les journaux : le parcours partait de
 * `https://vesti8.app` — l'apex, sans `www` — alors que l'app est servie sur
 * `https://www.vesti8.app`. Or le flux PKCE dépose un `code_verifier` dans un
 * cookie posé sur l'ORIGINE DE LA PAGE. Google renvoyait donc vers
 * `https://vesti8.app/auth/callback?code=…`, Vercel répondait 307 vers `www`,
 * et le cookie — rattaché à l'apex — ne suivait pas. Sans lui, l'échange du
 * code contre une session est impossible, et aucune requête n'atteignait même
 * `/auth/callback`.
 *
 * ⚠️ Ce qu'il faut comprendre pour ne pas « simplifier » ceci plus tard :
 * corriger le seul `redirectTo` du bouton Google NE SUFFIT PAS. Le cookie est
 * écrit avant le départ, sur le domaine où la page tourne ; le pointer vers
 * `www` laisserait toujours le verifier sur l'apex. Il faut que la personne
 * soit DÉJÀ sur le domaine canonique quand elle appuie sur le bouton — donc
 * une redirection en amont, pas un réglage dans le formulaire.
 *
 * Vercel redirige déjà l'apex vers `www` au niveau du domaine. Cette règle-ci
 * fait la même chose une couche plus bas, là où l'app en a la maîtrise : elle
 * couvre tout domaine supplémentaire qu'on brancherait un jour sur le projet
 * sans y penser, et tout angle mort de la configuration d'hébergement. Le coût
 * est nul quand le domaine est déjà le bon, c'est-à-dire presque toujours.
 */
function canonicalRedirect(request: NextRequest): URL | null {
  // ⚠️ Navigations seulement. Rediriger un POST rejouerait son corps vers un
  // autre domaine — sur `/api/stripe/checkout` ou une action serveur, ce serait
  // une requête exécutée deux fois ou perdue en route.
  if (request.method !== "GET" && request.method !== "HEAD") return null;

  let canonicalHost: string;
  try {
    canonicalHost = new URL(env.siteUrl).host;
  } catch {
    // `siteUrl` mal formée : on ne redirige nulle part plutôt que quelque part
    // au hasard. Une redirection fausse ici rendrait le site inatteignable.
    return null;
  }

  const host = request.nextUrl.host;
  if (!host || host === canonicalHost) return null;

  /*
    ⚠️ LA GARDE QUI COMPTE. `NEXT_PUBLIC_SITE_URL` vaut l'adresse de PRODUCTION
    dans tous les environnements, previews comprises. Sans ces deux lignes,
    chaque déploiement de preview et chaque `next dev` se renverrait lui-même
    vers la production : plus aucune preview relisible, et le développement
    local qui saute sur le site en ligne au premier chargement.
  */
  if (host.endsWith(".vercel.app")) return null;
  if (host === "localhost" || host.startsWith("localhost:")) return null;
  if (host === "127.0.0.1" || host.startsWith("127.0.0.1:")) return null;

  // Construite depuis `siteUrl` plutôt qu'en remplaçant le host de l'URL
  // courante : le protocole et le port viennent alors du canonique, sans
  // dépendre de ce que l'hébergeur a mis dans l'en-tête `Host`.
  return new URL(`${request.nextUrl.pathname}${request.nextUrl.search}`, env.siteUrl);
}

export async function proxy(request: NextRequest) {
  /*
    Le domaine d'abord, avant tout le reste.

    ⚠️ Avant la session Supabase, et c'est volontaire : valider un jeton pour
    une réponse qu'on va remplacer par une redirection coûte un aller-retour
    réseau pour rien. Avant la capture du code de parrainage aussi — `?ref=`
    voyage dans la query et sera traité par le proxy du domaine canonique,
    au tour suivant.

    307 et non 308 : temporaire. Un 308 est mis en cache durablement par les
    navigateurs, et resterait collé chez les gens bien après un changement de
    domaine — exactement le genre de décision qu'on ne peut plus reprendre.
  */
  const canonical = canonicalRedirect(request);
  if (canonical) return NextResponse.redirect(canonical, 307);

  let response = NextResponse.next({ request });

  const supabase = createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
        // @supabase/ssr fournit des en-têtes `no-store` à poser sur toute
        // réponse qui écrit des cookies d'auth : sans eux, un CDN ou un reverse
        // proxy peut mettre la réponse en cache et servir la session d'un
        // utilisateur à un autre.
        for (const [key, value] of Object.entries(headers)) {
          response.headers.set(key, value);
        }
      },
    },
  });

  // getUser() (et pas getSession()) : c'est le seul qui valide le JWT auprès
  // du serveur Supabase. getSession() se contente de lire le cookie, qui est
  // falsifiable côté client.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname, search } = request.nextUrl;

  // Lien influenceur (vesti.app/?ref=LEA10) : on mémorise le code avant même
  // l'inscription, pour le pré-remplir à l'onboarding. Sans ça, l'attribution
  // reposerait entièrement sur la mémoire de l'utilisateur au moment de taper
  // son code.
  const ref = request.nextUrl.searchParams.get("ref");
  if (ref) {
    response.cookies.set(REFERRAL_COOKIE, ref.slice(0, 32), {
      maxAge: 60 * 60 * 24 * 30,
      httpOnly: false, // lu par le formulaire d'onboarding côté client
      sameSite: "lax",
      path: "/",
    });

    // Le code est rangé dans le cookie : on le retire de l'URL et on renvoie
    // vers l'adresse propre.
    //
    // ⚠️ Sans ça, `?ref=` reste dans la barre d'adresse — et suit tout ce qu'on
    // en copie. Quelqu'un qui partage « le lien de l'app » à ses amis leur
    // envoie en réalité le lien parrainé de la dernière personne dont il a
    // suivi le lien. L'app installée aggravait le cas : son `start_url`
    // contient le code, donc chaque lancement le remettait dans l'URL.
    //
    // ⚠️ SAUF pour le manifeste, et c'est vital : c'est justement le paramètre
    // de son URL qui inscrit le code dans `start_url` (voir
    // `app/manifest.webmanifest/route.ts`). Le lui retirer casserait
    // l'attribution sur iPhone — le défaut le plus coûteux du parcours
    // influenceur, celui que ce manifeste dynamique existe pour éviter.
    //
    // Limité aux GET : rediriger un POST le rejouerait à l'aveugle.
    if (pathname !== "/manifest.webmanifest" && request.method === "GET") {
      const clean = request.nextUrl.clone();
      clean.searchParams.delete("ref");

      const redirect = NextResponse.redirect(clean);
      // Les cookies déjà posés sur `response` — le code qu'on vient de ranger,
      // mais aussi la session Supabase rafraîchie juste au-dessus. Les oublier
      // déconnecterait au passage quiconque arrive par un lien parrainé.
      for (const cookie of response.cookies.getAll()) {
        redirect.cookies.set(cookie);
      }
      return redirect;
    }
  }

  if (!user && matches(pathname, PROTECTED_PREFIXES)) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  if (user && matches(pathname, GUEST_ONLY_PREFIXES)) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Toutes les routes sauf les assets statiques et les images : sans cette
     * exclusion, chaque requête de CSS/JS/image déclencherait une validation de
     * session auprès de Supabase.
     *
     * Le webhook Stripe est exclu aussi : il n'a pas de session à rafraîchir et
     * s'authentifie par signature. L'y faire passer ajouterait un aller-retour
     * Supabase à chaque event, sur un endpoint où Stripe attend une réponse
     * rapide sous peine de rejouer l'appel.
     */
    "/((?!_next/static|_next/image|favicon.ico|api/stripe/webhook|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico)$).*)",
  ],
};
