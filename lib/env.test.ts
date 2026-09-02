import { describe, expect, it } from "vitest";
import { __test } from "./env";

const { firstFilled } = __test;

describe("firstFilled", () => {
  it("prend la première valeur renseignée", () => {
    expect(firstFilled("a", "b")).toBe("a");
    expect(firstFilled(undefined, "b")).toBe("b");
  });

  it("traite une variable vide comme absente", () => {
    // C'est le cas qui compte : dans un tableau de bord, une variable créée
    // mais jamais remplie existe et vaut "". Sans ça, l'app démarrerait avec
    // une URL vide au lieu d'utiliser son repli.
    expect(firstFilled("", "b")).toBe("b");
    expect(firstFilled("   ", "b")).toBe("b");
  });

  it("retire les espaces autour", () => {
    // Une valeur collée depuis un tableau de bord traîne souvent un espace ou
    // un retour à la ligne.
    expect(firstFilled("  https://exemple.fr  ")).toBe("https://exemple.fr");
  });

  it("rend undefined quand rien n'est renseigné", () => {
    expect(firstFilled(undefined, "", "  ")).toBeUndefined();
  });
});
