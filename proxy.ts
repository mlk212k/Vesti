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

export async function proxy(request: NextRequest) {
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
