import { describe, expect, it } from "vitest";
import { THEME_KEY, THEME_SCRIPT, isThemeChoice } from "./theme";

describe("isThemeChoice", () => {
  it("accepte les trois choix", () => {
    expect(isThemeChoice("system")).toBe(true);
    expect(isThemeChoice("light")).toBe(true);
    expect(isThemeChoice("dark")).toBe(true);
  });

  it("refuse tout le reste", () => {
    // Le stockage est modifiable à la main : une valeur inconnue ne doit pas
    // finir posée telle quelle sur <html>.
    expect(isThemeChoice("SOMBRE")).toBe(false);
    expect(isThemeChoice(null)).toBe(false);
    expect(isThemeChoice(undefined)).toBe(false);
    expect(isThemeChoice(1)).toBe(false);
  });
});

describe("THEME_SCRIPT", () => {
  it("ne pose l'attribut que pour un choix explicite", () => {
    // « système » ne doit RIEN poser : c'est l'absence d'attribut qui rend la
    // main à prefers-color-scheme.
    expect(THEME_SCRIPT).toContain('choice === "light" || choice === "dark"');
    expect(THEME_SCRIPT).not.toContain('"system"');
  });

  it("utilise la même clé de stockage que le reste du module", () => {
    // Le script est du texte : rien ne le relierait à THEME_KEY si la clé y
    // était réécrite à la main, et le bouton des réglages n'aurait plus d'effet.
    expect(THEME_SCRIPT).toContain(JSON.stringify(THEME_KEY));
  });

  it("survit à un stockage refusé", () => {
    // Navigation privée, cookies bloqués : le script ne doit pas jeter, sinon
    // il casse le rendu de la page entière.
    expect(THEME_SCRIPT).toContain("try");
    expect(THEME_SCRIPT).toContain("catch");
  });

  it("ne contient pas de saut de ligne en fin qui casserait l'inline", () => {
    expect(THEME_SCRIPT).toBe(THEME_SCRIPT.trim());
  });
});
