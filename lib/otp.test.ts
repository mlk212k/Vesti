import { describe, expect, it } from "vitest";
import {
  OTP_VERIFY_TYPES,
  isOtpComplete,
  normalizeOtp,
  otpErrorMessage,
} from "./otp";

describe("normalizeOtp", () => {
  it("garde un code déjà propre", () => {
    expect(normalizeOtp("123456")).toBe("123456");
  });

  it("récupère un code collé depuis un mail", () => {
    // Le cas réel : personne ne retape le code, tout le monde le colle avec ce
    // qui l'entoure. Refuser « 123 456 » serait refuser le bon code.
    expect(normalizeOtp("123 456")).toBe("123456");
    expect(normalizeOtp("Votre code : 123456")).toBe("123456");
    expect(normalizeOtp("123-456")).toBe("123456");
    expect(normalizeOtp("\n123456\n")).toBe("123456");
    // Espace insécable, tel que collé depuis certains clients mail.
    expect(normalizeOtp("123 456")).toBe("123456");
  });

  it("tronque au-delà de six chiffres", () => {
    expect(normalizeOtp("1234567890")).toBe("123456");
  });

  it("rend une chaîne vide quand il n'y a aucun chiffre", () => {
    expect(normalizeOtp("abcdef")).toBe("");
    expect(normalizeOtp("")).toBe("");
  });
});

describe("isOtpComplete", () => {
  it("n'accepte que six chiffres", () => {
    expect(isOtpComplete("123456")).toBe(true);
    expect(isOtpComplete("12345")).toBe(false);
    expect(isOtpComplete("")).toBe(false);
  });

  it("juge sur le code nettoyé, pas sur la saisie brute", () => {
    expect(isOtpComplete("123 456")).toBe(true);
    expect(isOtpComplete("12 34")).toBe(false);
  });
});

describe("otpErrorMessage", () => {
  it("renvoie vers un nouveau code quand celui-ci ne vaut plus rien", () => {
    expect(otpErrorMessage("Token has expired or is invalid")).toContain(
      "nouveau"
    );
  });

  it("distingue la limite de débit", () => {
    expect(otpErrorMessage("email rate limit exceeded")).toContain("minute");
  });

  it("a une phrase de repli pour l'inconnu", () => {
    expect(otpErrorMessage(undefined)).toBe(
      "La vérification a échoué. Réessaie dans un instant."
    );
  });
});

describe("OTP_VERIFY_TYPES", () => {
  it("essaie le type générique en premier, puis les deux cas particuliers", () => {
    // L'ordre compte : `email` couvre le cas normal en une seule requête ;
    // `magiclink` (adresse connue) et `signup` (adresse neuve) ne servent que
    // lorsque Supabase a rangé le code ailleurs.
    expect([...OTP_VERIFY_TYPES]).toEqual(["email", "magiclink", "signup"]);
  });
});
