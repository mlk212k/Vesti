import { describe, expect, it } from "vitest";
import { affiliateUrl, matchMerchant, parseMerchantMap } from "./affiliate";

const MERCHANTS = parseMerchantMap("asos.com:1234,hm.com:5678,zalando.fr:9012");
const CONFIG = { awinAffiliateId: "999888", merchants: MERCHANTS };

/** Ce que le lien doit valoir quand la transformation ne s'applique pas. */
const PRODUCT = "https://www.asos.com/fr/chino-beige/prd/12345?colourId=7&lang=fr";

describe("parseMerchantMap", () => {
  it("lit la forme normale", () => {
    const map = parseMerchantMap("asos.com:1234,hm.com:5678");
    expect(map.get("asos.com")).toBe("1234");
    expect(map.get("hm.com")).toBe("5678");
  });

  it("tolère espaces, casse et www — c'est du copier-coller depuis un tableau de bord", () => {
    const map = parseMerchantMap("  WWW.Asos.COM : 1234 , hm.com:5678 ,");
    expect(map.get("asos.com")).toBe("1234");
    expect(map.get("hm.com")).toBe("5678");
    expect(map.size).toBe(2);
  });

  it("ignore une entrée incomplète plutôt que de la deviner", () => {
    const map = parseMerchantMap("asos.com,hm.com:,:1234,zalando.fr:9012");
    expect(map.size).toBe(1);
    expect(map.get("zalando.fr")).toBe("9012");
  });

  it("rend une table vide quand rien n'est configuré", () => {
    expect(parseMerchantMap(undefined).size).toBe(0);
    expect(parseMerchantMap("").size).toBe(0);
  });
});

describe("matchMerchant", () => {
  it("reconnaît le domaine nu et le www", () => {
    expect(matchMerchant("asos.com", MERCHANTS)).toBe("1234");
    expect(matchMerchant("www.asos.com", MERCHANTS)).toBe("1234");
  });

  it("reconnaît un sous-domaine", () => {
    expect(matchMerchant("m.asos.com", MERCHANTS)).toBe("1234");
  });

  /**
   * ⚠️ Le test qui justifie la comparaison sur frontière de point.
   *
   * Avec un `includes`, ces deux hôtes correspondraient à `asos.com` et on
   * enverrait des acheteurs vers une redirection d'affiliation depuis un site
   * qui n'a rien à voir avec le programme.
   */
  it("ne confond pas un domaine qui contient le nom du marchand", () => {
    expect(matchMerchant("faux-asos.com", MERCHANTS)).toBeNull();
    expect(matchMerchant("asos.com.exemple.net", MERCHANTS)).toBeNull();
  });

  it("rend null pour un marchand absent de la table", () => {
    expect(matchMerchant("uniqlo.com", MERCHANTS)).toBeNull();
  });
});

describe("affiliateUrl — les cas où le lien doit ressortir INCHANGÉ", () => {
  it("sans identifiant éditeur : le produit se comporte comme avant", () => {
    expect(affiliateUrl(PRODUCT, { merchants: MERCHANTS })).toBe(PRODUCT);
    expect(
      affiliateUrl(PRODUCT, { awinAffiliateId: "", merchants: MERCHANTS })
    ).toBe(PRODUCT);
  });

  it("sans table de marchands", () => {
    expect(
      affiliateUrl(PRODUCT, { awinAffiliateId: "999888", merchants: new Map() })
    ).toBe(PRODUCT);
  });

  it("marchand inconnu : lien direct non rémunéré plutôt que lien faux", () => {
    const other = "https://www.uniqlo.com/fr/chino/123";
    expect(affiliateUrl(other, CONFIG)).toBe(other);
  });

  it("URL illisible : on ne casse pas un lien qu'on ne comprend pas", () => {
    expect(affiliateUrl("pas une url", CONFIG)).toBe("pas une url");
  });

  it("protocole non web : rien à faire dans un href sortant", () => {
    const hostile = "javascript:alert(1)";
    expect(affiliateUrl(hostile, CONFIG)).toBe(hostile);
  });

  /** Une cascade de redirections n'est pas créditée par les réseaux. */
  it("lien déjà affilié : jamais enveloppé deux fois", () => {
    const once = affiliateUrl(PRODUCT, CONFIG);
    expect(affiliateUrl(once, CONFIG)).toBe(once);
  });
});

describe("affiliateUrl — la transformation", () => {
  it("construit le lien profond avec les deux identifiants", () => {
    const link = new URL(affiliateUrl(PRODUCT, CONFIG));

    expect(link.hostname).toBe("www.awin1.com");
    expect(link.pathname).toBe("/cread.php");
    expect(link.searchParams.get("awinmid")).toBe("1234");
    expect(link.searchParams.get("awinaffid")).toBe("999888");
  });

  /**
   * ⚠️ Le test qui compte vraiment.
   *
   * Une URL produit porte presque toujours des `&` de paramètres. Sans
   * encodage, ils couperaient le lien d'affiliation en deux : le réseau
   * recevrait une destination tronquée, et l'acheteur atterrirait sur la
   * mauvaise page — ou nulle part.
   */
  it("préserve la destination entière, paramètres compris", () => {
    const link = new URL(affiliateUrl(PRODUCT, CONFIG));
    const destination = link.searchParams.get("ued");

    expect(destination).toBe(PRODUCT);
    expect(new URL(destination!).searchParams.get("colourId")).toBe("7");
    expect(new URL(destination!).searchParams.get("lang")).toBe("fr");
  });

  it("s'applique aussi depuis un sous-domaine du marchand", () => {
    const mobile = "https://m.asos.com/fr/chino/prd/999";
    const link = new URL(affiliateUrl(mobile, CONFIG));
    expect(link.searchParams.get("awinmid")).toBe("1234");
    expect(link.searchParams.get("ued")).toBe(mobile);
  });

  it("donne à chaque marchand SON identifiant", () => {
    const hm = new URL(affiliateUrl("https://www2.hm.com/fr_fr/p/123", CONFIG));
    const zalando = new URL(affiliateUrl("https://www.zalando.fr/chino-123", CONFIG));

    expect(hm.searchParams.get("awinmid")).toBe("5678");
    expect(zalando.searchParams.get("awinmid")).toBe("9012");
  });
});
