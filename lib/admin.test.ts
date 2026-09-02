import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

vi.mock("server-only", () => ({}));

const { isAdminEmail, adminIsConfigured } = await import("./admin");

const original = process.env.ADMIN_EMAILS;

beforeEach(() => {
  delete process.env.ADMIN_EMAILS;
});

afterEach(() => {
  if (original === undefined) delete process.env.ADMIN_EMAILS;
  else process.env.ADMIN_EMAILS = original;
});

describe("isAdminEmail", () => {
  it("n'autorise personne quand la variable n'est pas configurée", () => {
    // Le défaut doit être fermé : une variable oubliée ne doit pas ouvrir le
    // back-office à tout le monde.
    expect(isAdminEmail("moi@vesti.fr")).toBe(false);
    expect(adminIsConfigured()).toBe(false);
  });

  it("n'autorise personne quand la liste est vide", () => {
    process.env.ADMIN_EMAILS = "  ,  ";
    expect(isAdminEmail("moi@vesti.fr")).toBe(false);
  });

  it("autorise un email listé", () => {
    process.env.ADMIN_EMAILS = "moi@vesti.fr";
    expect(isAdminEmail("moi@vesti.fr")).toBe(true);
  });

  it("ignore la casse et les espaces, des deux côtés", () => {
    process.env.ADMIN_EMAILS = " Moi@Vesti.FR , associe@vesti.fr ";
    expect(isAdminEmail("moi@vesti.fr")).toBe(true);
    expect(isAdminEmail("  ASSOCIE@vesti.fr ")).toBe(true);
  });

  it("refuse un email absent de la liste", () => {
    process.env.ADMIN_EMAILS = "moi@vesti.fr";
    expect(isAdminEmail("quelquun@ailleurs.fr")).toBe(false);
  });

  it("refuse une valeur vide ou absente", () => {
    process.env.ADMIN_EMAILS = "moi@vesti.fr";
    expect(isAdminEmail(null)).toBe(false);
    expect(isAdminEmail(undefined)).toBe(false);
    expect(isAdminEmail("")).toBe(false);
  });

  it("ne se laisse pas piéger par un email qui contient celui d'un admin", () => {
    process.env.ADMIN_EMAILS = "moi@vesti.fr";
    expect(isAdminEmail("moi@vesti.fr.evil.tld")).toBe(false);
    expect(isAdminEmail("xmoi@vesti.fr")).toBe(false);
  });
});
