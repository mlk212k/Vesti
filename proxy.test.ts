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
  env: { supabaseUrl: "https://exemple.supabase.co", supabaseAnonKey: "cle" },
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
