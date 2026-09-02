import { describe, expect, it } from "vitest";
import { PASSWORD_MIN_LENGTH, authErrorMessage, passwordProblem } from "./password";

describe("passwordProblem", () => {
  it("accepte un mot de passe assez long", () => {
    expect(passwordProblem("motdepasse")).toBeNull();
    expect(passwordProblem("a".repeat(PASSWORD_MIN_LENGTH))).toBeNull();
  });

  it("refuse un mot de passe trop court", () => {
    expect(passwordProblem("a".repeat(PASSWORD_MIN_LENGTH - 1))).toContain(
      String(PASSWORD_MIN_LENGTH)
    );
  });

  it("distingue le champ vide du champ trop court", () => {
    // Deux situations différentes pour la personne : elle n'a rien tapé, ou
    // elle a tapé quelque chose d'insuffisant. Le même message pour les deux
    // laisserait croire que la saisie n'a pas été prise en compte.
    expect(passwordProblem("")).toBe("Choisis un mot de passe.");
    expect(passwordProblem("abc")).not.toBe("Choisis un mot de passe.");
  });

  it("compte les caractères, pas les octets", () => {
    // Huit emoji, c'est huit caractères pour la personne qui les tape.
    expect(passwordProblem("é".repeat(PASSWORD_MIN_LENGTH))).toBeNull();
  });
});

describe("authErrorMessage", () => {
  it("traduit les erreurs connues", () => {
    expect(authErrorMessage("Invalid login credentials")).toBe(
      "Email ou mot de passe incorrect."
    );
    expect(authErrorMessage("User already registered")).toContain("existe déjà");
    expect(authErrorMessage("Email not confirmed")).toContain("Mot de passe oublié");
  });

  it("ne dit jamais si c'est l'adresse ou le mot de passe qui est faux", () => {
    // Le distinguer révélerait quelles adresses ont un compte chez nous.
    const message = authErrorMessage("Invalid login credentials");
    expect(message).toContain("ou");
    expect(message.toLowerCase()).not.toContain("compte introuvable");
  });

  it("retombe sur un message utile pour une erreur inconnue", () => {
    // Jamais l'erreur brute de Supabase : elle est en anglais et parle
    // d'implémentation.
    const message = authErrorMessage("pq: relation does not exist");
    expect(message).toBe("La connexion a échoué. Réessaie dans un instant.");
    expect(authErrorMessage(undefined)).toBe(message);
  });
});
