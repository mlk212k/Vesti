/**
 * Les tests de l'essai sans compte.
 *
 * ⚠️ CE FICHIER PROTÈGE DE L'ARGENT, pas une mise en page. Chaque essai est un
 * appel au modèle payé sans contrepartie — 0,039 $ le verdict, mesuré. Les
 * limites ne se voient nulle part quand elles marchent, et quand elles cassent,
 * ça se découvre sur une facture.
 *
 * Deux règles tiennent ici, et aucune ne fait échouer quoi que ce soit en
 * disparaissant :
 *
 *  - le chemin de la photo doit appartenir à l'essai en cours. C'est la
 *    vérification qui empêche de faire LIRE la photo de n'importe quel compte :
 *    l'URL de lecture est signée par la clé de service, donc elle ouvre tout ce
 *    qu'on lui donne ;
 *  - l'adresse IP n'est jamais stockée en clair.
 */

import { describe, expect, it, vi } from "vitest";

// Même convention que `lib/admin.test.ts` : le garde `server-only` protège le
// code d'un import client, pas d'un banc d'essai.
vi.mock("server-only", () => ({}));

vi.mock("@/lib/env.server", () => ({
  serverEnv: { supabaseServiceRoleKey: "sel-de-test" },
}));

const {
  MAX_TRIALS_PER_DAY,
  MAX_TRIALS_PER_IP_PER_DAY,
  buildAnonPath,
  clientIp,
  hashIp,
  pathBelongsToTrial,
  trialRefusalMessage,
} = await import("./anon-trial");

const TRIAL = "11111111-2222-3333-4444-555555555555";
const AUTRE = "99999999-8888-7777-6666-555555555555";

describe("à qui appartient la photo", () => {
  it("accepte un chemin de l'essai en cours", () => {
    const path = buildAnonPath(TRIAL, "jpg");
    expect(pathBelongsToTrial(path, TRIAL)).toBe(true);
  });

  /**
   * ⚠️ LE test du fichier. L'URL de lecture est signée par la clé de service :
   * elle ouvre n'importe quel chemin du bucket, y compris le dossier d'un
   * compte. Sans cette vérification, il suffit d'envoyer le chemin de quelqu'un
   * d'autre pour faire analyser — donc lire — sa photo.
   */
  it("⚠️ refuse le chemin d'un autre essai", () => {
    const path = buildAnonPath(AUTRE, "jpg");
    expect(pathBelongsToTrial(path, TRIAL)).toBe(false);
  });

  it("⚠️ refuse le dossier d'un compte", () => {
    // Les comptes stockent sous `{user_id}/…`, sans préfixe `anon/`.
    expect(pathBelongsToTrial(`${TRIAL}/photo.jpg`, TRIAL)).toBe(false);
  });

  it("⚠️ ne se laisse pas avoir par un préfixe qui ressemble", () => {
    // `anon/1111…-suite/` commence bien par le jeton, mais n'est pas son
    // dossier. Sans le `/` final dans la comparaison, il passerait.
    expect(pathBelongsToTrial(`anon/${TRIAL}-bis/photo.jpg`, TRIAL)).toBe(false);
  });

  it("refuse une remontée de dossier", () => {
    expect(pathBelongsToTrial("../autre/photo.jpg", TRIAL)).toBe(false);
  });

  it("n'accepte que des extensions plausibles", () => {
    // Une extension exotique retombe sur jpg plutôt que de voyager telle quelle
    // jusque dans un nom de fichier.
    expect(buildAnonPath(TRIAL, "../../x")).toMatch(/\.jpg$/);
    expect(buildAnonPath(TRIAL, "png")).toMatch(/\.png$/);
  });
});

describe("l'adresse IP", () => {
  /** ⚠️ Une IP est une donnée personnelle. On ne garde que de quoi comparer. */
  it("n'est jamais rendue en clair", () => {
    const empreinte = hashIp("81.250.14.7");
    expect(empreinte).not.toBeNull();
    expect(empreinte).not.toContain("81.250");
    expect(empreinte).toMatch(/^[0-9a-f]{32}$/);
  });

  it("deux visiteurs différents ne se confondent pas", () => {
    expect(hashIp("81.250.14.7")).not.toBe(hashIp("81.250.14.8"));
  });

  it("le même visiteur est reconnu", () => {
    expect(hashIp("81.250.14.7")).toBe(hashIp("81.250.14.7"));
  });

  it("une adresse absente donne null, pas une empreinte inventée", () => {
    expect(hashIp(null)).toBeNull();
  });

  it("lit la première adresse de la chaîne de relais", () => {
    const request = new Request("https://vesti.app/", {
      headers: { "x-forwarded-for": "81.250.14.7, 10.0.0.1, 172.16.0.1" },
    });
    expect(clientIp(request)).toBe("81.250.14.7");
  });

  it("retombe sur x-real-ip, puis sur null", () => {
    expect(
      clientIp(new Request("https://vesti.app/", { headers: { "x-real-ip": "1.2.3.4" } }))
    ).toBe("1.2.3.4");
    expect(clientIp(new Request("https://vesti.app/"))).toBeNull();
  });
});

describe("les plafonds", () => {
  /**
   * ⚠️ Les défauts sont bas EXPRÈS, et calés sur les comptes réels : zéro
   * abonné payant, 4,24 $ de dépense modèle sur le mois. 50 essais ≈ 2 $ par
   * jour, donc de l'argent qui sort d'une poche sans rien en face.
   *
   * La borne de ce test est à 60 et non à 200 : un défaut relevé « au cas où »
   * ne se découvrirait que sur une facture. Le relever suppose de toucher CE
   * test, donc de relire pourquoi il est là — c'est tout son intérêt.
   */
  it("restent modestes tant que personne ne les a relevés", () => {
    expect(MAX_TRIALS_PER_DAY).toBeLessThanOrEqual(60);
    expect(MAX_TRIALS_PER_IP_PER_DAY).toBeLessThanOrEqual(5);
  });

  it("sont des entiers positifs", () => {
    expect(Number.isInteger(MAX_TRIALS_PER_DAY)).toBe(true);
    expect(Number.isInteger(MAX_TRIALS_PER_IP_PER_DAY)).toBe(true);
    expect(MAX_TRIALS_PER_DAY).toBeGreaterThan(0);
  });
});

describe("ce qu'on dit quand un plafond est atteint", () => {
  /**
   * La personne n'a rien fait de mal, et l'essai gratuit n'est pas un dû qu'on
   * lui retire. Le message propose la seule chose qui marche encore.
   */
  it("ne reproche rien et propose le compte", () => {
    for (const refus of ["daily_cap", "ip_cap"] as const) {
      const message = trialRefusalMessage(refus);
      expect(message).toMatch(/compte/i);
      expect(message).toMatch(/gratuit/i);
      expect(message).not.toMatch(/limite|interdit|abus/i);
    }
  });
});
