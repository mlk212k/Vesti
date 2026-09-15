import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

/**
 * Le trajet du code influenceur à travers le proxy.
 *
 * Deux exigences opposées se croisent ici, et c'est ce qui rend ce fichier
 * digne d'un test :
 *
 *  - le code doit DISPARAÎTRE de l'URL des pages, sinon il suit tout ce qu'on
 *    copie depuis la barre d'adresse — et « le lien de l'app » qu'on envoie à
 *    ses amis devient le lien parrainé de quelqu'un d'autre ;
 *  - il doit RESTER dans l'URL du manifeste, parce que c'est précisément ce
 *    paramètre qui l'inscrit dans `start_url`, donc dans l'app installée. Le
 *    retirer là casserait l'attribution sur iPhone sans aucun signal visible.
 *
 * Une simplification qui traiterait les deux cas pareil paraîtrait plus propre
 * et casserait l'un des deux. D'où ces tests.
 */

// Supabase n'a rien à faire ici : on teste le trajet du code, pas la session.
// Sans ce mock, chaque cas partirait valider un JWT sur le réseau.
vi.mock("@supabase/ssr", () => ({
  createServerClient: () => ({
    auth: { getUser: async () => ({ data: { user: null } }) },
  }),
}));

vi.mock("@/lib/env", () => ({
  env: {
    supabaseUrl: "https://exemple.supabase.co",
    supabaseAnonKey: "cle",
    // Le domaine canonique du site. Les cas de code influenceur ci-dessous
    // interrogent ce même domaine : ils ne doivent donc jamais déclencher la
    // redirection canonique, seulement le traitement du `?ref=`.
    siteUrl: "https://vesti.app",
  },
}));

const { proxy, REFERRAL_COOKIE } = await import("./proxy");

const ask = (url: string, method = "GET") =>
  proxy(new NextRequest(new Request(url, { method })));

describe("code influenceur dans l'URL", () => {
  beforeEach(() => vi.clearAllMocks());

  it("range le code puis le retire de l'URL", async () => {
    const response = await ask("https://vesti.app/?ref=LEA10");

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://vesti.app/");
    expect(response.cookies.get(REFERRAL_COOKIE)?.value).toBe("LEA10");
  });

  it("garde le reste de l'adresse intact", async () => {
    // Le code s'en va, pas les autres paramètres : ils portent parfois le
    // contexte de la page où l'on voulait aller.
    const response = await ask("https://vesti.app/login?ref=LEA10&next=%2Fdressing");

    expect(response.headers.get("location")).toBe(
      "https://vesti.app/login?next=%2Fdressing"
    );
  });

  it("⚠️ laisse le code au manifeste, sans quoi l'app installée le perd", async () => {
    // Ce test est la raison d'être du fichier. Voir l'en-tête.
    const response = await ask(
      "https://vesti.app/manifest.webmanifest?ref=LEA10"
    );

    expect(response.status).not.toBe(307);
    expect(response.cookies.get(REFERRAL_COOKIE)?.value).toBe("LEA10");
  });

  it("ne redirige pas un envoi de formulaire", async () => {
    // Un 307 rejoue la requête telle quelle, corps compris : rediriger un POST
    // le soumettrait deux fois.
    const response = await ask("https://vesti.app/?ref=LEA10", "POST");

    expect(response.status).not.toBe(307);
    expect(response.cookies.get(REFERRAL_COOKIE)?.value).toBe("LEA10");
  });

  it("ne touche à rien sans code", async () => {
    const response = await ask("https://vesti.app/");

    expect(response.status).not.toBe(307);
    expect(response.cookies.get(REFERRAL_COOKIE)).toBeUndefined();
  });
});

/**
 * Le rabattement sur le domaine canonique.
 *
 * ⚠️ CE QUI EST EN JEU : une inscription Google a créé un compte sans jamais
 * créer de session. `auth.identities` portait l'identité Google,
 * `auth.sessions` était vide, et la personne revenait sur la page de vente en
 * croyant s'être connectée — le compte existant, réessayer ne réparait rien.
 *
 * La cause : le parcours partait de `vesti8.app`, l'apex, alors que l'app est
 * servie sur `www.vesti8.app`. Le flux PKCE dépose son `code_verifier` dans un
 * cookie rattaché à l'origine de la page ; après le saut apex → www, ce cookie
 * ne suivait pas, et le code ne pouvait plus être échangé.
 *
 * Ces tests tiennent les deux bords. Trop peu de redirection et le bug revient
 * en silence — personne ne remonte « je n'ai pas pu créer mon compte ». Trop,
 * et on renvoie les previews et le poste de développement vers la production,
 * ce qui est tout aussi invisible depuis la prod.
 */
describe("domaine canonique", () => {
  beforeEach(() => vi.clearAllMocks());

  it("⚠️ rabat l'apex sur le domaine canonique", async () => {
    const response = await ask("https://autre.vesti.app/login");

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://vesti.app/login");
  });

  it("⚠️ le code OAuth survit au saut de domaine", async () => {
    // Le cas exact du bug : sans ce report, le `code` est perdu et l'échange
    // ne peut plus avoir lieu du tout.
    const response = await ask(
      "https://autre.vesti.app/auth/callback?code=abc123&next=%2Fdashboard"
    );

    expect(response.headers.get("location")).toBe(
      "https://vesti.app/auth/callback?code=abc123&next=%2Fdashboard"
    );
  });

  it("ne redirige pas quand on est déjà au bon endroit", async () => {
    const response = await ask("https://vesti.app/login");
    expect(response.status).not.toBe(307);
  });

  /**
   * ⚠️ `NEXT_PUBLIC_SITE_URL` vaut l'adresse de PRODUCTION dans tous les
   * environnements. Sans cette exception, chaque déploiement de preview se
   * renverrait vers la production : plus une seule preview relisible, et le
   * défaut ne se verrait jamais depuis la prod, qui elle irait très bien.
   */
  it("⚠️ laisse les previews tranquilles", async () => {
    const response = await ask("https://vesti-abc123-mlk212k.vercel.app/login");
    expect(response.status).not.toBe(307);
  });

  it("⚠️ laisse le développement local tranquille", async () => {
    for (const origine of ["http://localhost:3000", "http://127.0.0.1:3000"]) {
      const response = await ask(`${origine}/login`);
      expect(response.status).not.toBe(307);
    }
  });

  /**
   * Un 307 rejoue la requête telle quelle, corps compris. Le faire sur un POST
   * enverrait une action serveur ou un appel d'API vers un autre domaine, où
   * elle repartirait une seconde fois.
   */
  it("ne redirige jamais un POST", async () => {
    const response = await ask("https://autre.vesti.app/api/stripe/checkout", "POST");
    expect(response.status).not.toBe(307);
  });

  it("le code influenceur voyage avec la redirection", async () => {
    // Il n'est pas rangé en cookie ici : il reste dans la query et c'est le
    // proxy du domaine canonique qui le traitera au tour suivant. Le ranger des
    // deux côtés poserait le cookie sur un domaine que la personne quitte.
    const response = await ask("https://autre.vesti.app/?ref=LEA10");

    expect(response.headers.get("location")).toBe("https://vesti.app/?ref=LEA10");
  });
});
