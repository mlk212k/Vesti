import { describe, expect, it } from "vitest";
import { normalizeReferralCode, safeNext } from "./navigation";

describe("safeNext", () => {
  it("laisse passer un chemin interne", () => {
    expect(safeNext("/analyze")).toBe("/analyze");
    expect(safeNext("/history?page=2")).toBe("/history?page=2");
  });

  it("retombe sur le dashboard quand rien n'est demandé", () => {
    expect(safeNext(null)).toBe("/dashboard");
    expect(safeNext(undefined)).toBe("/dashboard");
    expect(safeNext("")).toBe("/dashboard");
  });

  it("bloque les redirections vers un domaine externe", () => {
    // Les trois formes qu'un navigateur résout en URL absolue.
    expect(safeNext("https://evil.tld")).toBe("/dashboard");
    expect(safeNext("//evil.tld")).toBe("/dashboard");
    expect(safeNext("/\\evil.tld")).toBe("/dashboard");
  });

  it("bloque les schémas exotiques", () => {
    expect(safeNext("javascript:alert(1)")).toBe("/dashboard");
    expect(safeNext("data:text/html,<script>")).toBe("/dashboard");
  });
});

describe("normalizeReferralCode", () => {
  it("met en majuscules et retire séparateurs et espaces", () => {
    expect(normalizeReferralCode("lea-10")).toBe("LEA10");
    expect(normalizeReferralCode(" Lea 10 ")).toBe("LEA10");
  });

  it("jette tout ce qui n'est pas alphanumérique", () => {
    // La valeur repart dans une URL et dans un cookie : on ne l'échappe pas,
    // on la réduit à ce qu'un code peut contenir.
    expect(normalizeReferralCode("ABC<script>")).toBe("ABCSCRIPT");
    expect(normalizeReferralCode("../../etc")).toBe("ETC");
    expect(normalizeReferralCode("A&B=C")).toBe("ABC");
  });

  it("borne la longueur", () => {
    expect(normalizeReferralCode("A".repeat(200))).toHaveLength(32);
  });

  it("rend une chaîne vide sur une entrée sans rien d'utile", () => {
    expect(normalizeReferralCode("")).toBe("");
    expect(normalizeReferralCode("---")).toBe("");
  });
});
