import { describe, expect, it } from "vitest";
import { detectEnvironment, isOpenPath } from "./install";

// Chaînes relevées sur de vrais appareils : c'est le seul type de donnée qui
// vaille quelque chose pour ce genre de détection.
const UA = {
  tiktokIos:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 musical_ly_34.5.0 JsSdk/2.0 NetType/WIFI Channel/App Store ByteLocale/fr ByteFullLocale/fr-FR WKWebView/1 BytedanceWebview/d8a21c6",
  tiktokAndroid:
    "Mozilla/5.0 (Linux; Android 13; SM-A536B Build/TP1A.220624.014; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/122.0.6261.119 Mobile Safari/537.36 trill_340503 JsSdk/1.0 NetType/WIFI Channel/googleplay AppName/musical_ly app_version/34.5.3 BytedanceWebview/d8a21c6",
  instagram:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 322.0.0.28.112 (iPhone14,5; iOS 17_4; fr_FR)",
  safariIos:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1",
  chromeAndroid:
    "Mozilla/5.0 (Linux; Android 13; SM-A536B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36",
  chromeDesktop:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  safariIpad:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15",
};

describe("detectEnvironment", () => {
  it("reconnaît le navigateur de TikTok sur les deux plateformes", () => {
    // C'est LE cas qui compte : tout le trafic arrive par là, et on ne peut
    // rien y installer. Se tromper ici bloque l'app pour tout le monde.
    const ios = detectEnvironment({ userAgent: UA.tiktokIos });
    expect(ios.inAppBrowser).toBe("TikTok");
    expect(ios.os).toBe("ios");
    expect(ios.canInstallHere).toBe(false);

    const android = detectEnvironment({ userAgent: UA.tiktokAndroid });
    expect(android.inAppBrowser).toBe("TikTok");
    expect(android.os).toBe("android");
    expect(android.canInstallHere).toBe(false);
  });

  it("reconnaît les autres navigateurs intégrés", () => {
    expect(detectEnvironment({ userAgent: UA.instagram }).inAppBrowser).toBe(
      "Instagram"
    );
  });

  it("laisse installer depuis Safari iOS et Chrome Android", () => {
    const ios = detectEnvironment({ userAgent: UA.safariIos });
    expect(ios).toMatchObject({ os: "ios", inAppBrowser: null, canInstallHere: true });

    const android = detectEnvironment({ userAgent: UA.chromeAndroid });
    expect(android).toMatchObject({
      os: "android",
      inAppBrowser: null,
      canInstallHere: true,
    });
  });

  it("ne propose pas d'installer sur un ordinateur", () => {
    const desktop = detectEnvironment({ userAgent: UA.chromeDesktop });
    expect(desktop.os).toBe("other");
    expect(desktop.canInstallHere).toBe(false);
  });

  it("distingue un iPad d'un Mac malgré un user-agent identique", () => {
    // Depuis iPadOS 13, l'iPad se déclare « Macintosh ». Sans le nombre de
    // points de contact, on enverrait les iPad sur l'écran « ouvre sur ton
    // téléphone » alors qu'ils peuvent parfaitement installer l'app.
    expect(
      detectEnvironment({ userAgent: UA.safariIpad, maxTouchPoints: 5 })
    ).toMatchObject({ os: "ios", canInstallHere: true });

    expect(
      detectEnvironment({ userAgent: UA.safariIpad, maxTouchPoints: 0 })
    ).toMatchObject({ os: "other", canInstallHere: false });
  });
});

describe("isOpenPath", () => {
  it("laisse toujours passer le retour du lien de connexion", () => {
    // Le lien magique s'ouvre depuis la boîte mail, donc jamais depuis l'icône
    // de l'écran d'accueil. Le bloquer rendrait la connexion impossible.
    expect(isOpenPath("/auth/callback")).toBe(true);
  });

  it("laisse passer les pages légales", () => {
    // Elles doivent rester publiques avant tout achat : les enfermer derrière
    // la porte est un problème juridique, pas un détail d'ergonomie.
    expect(isOpenPath("/cgv")).toBe(true);
    expect(isOpenPath("/mentions-legales")).toBe(true);
    expect(isOpenPath("/confidentialite")).toBe(true);
  });

  it("laisse passer le back-office, consulté depuis un ordinateur", () => {
    expect(isOpenPath("/admin")).toBe(true);
    expect(isOpenPath("/admin/quelque-chose")).toBe(true);
  });

  it("ferme le tunnel", () => {
    expect(isOpenPath("/")).toBe(false);
    expect(isOpenPath("/login")).toBe(false);
    expect(isOpenPath("/onboarding")).toBe(false);
    expect(isOpenPath("/dashboard")).toBe(false);
    expect(isOpenPath("/analyze")).toBe(false);
  });

  it("ne se laisse pas contourner par un préfixe qui ressemble", () => {
    expect(isOpenPath("/cgv-truc")).toBe(false);
    expect(isOpenPath("/administration")).toBe(false);
  });
});
