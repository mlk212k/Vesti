import { describe, expect, it } from "vitest";
import { MAX_EDGE, fitWithin, replaceExtension } from "./downscale";

describe("fitWithin", () => {
  it("réduit une photo de téléphone au plafond", () => {
    // Photo iPhone typique en portrait : 3024×4032. Le grand côté descend à
    // 1280, l'autre suit proportionnellement.
    expect(fitWithin(3024, 4032)).toEqual({ width: 960, height: 1280 });

    // La même en paysage.
    expect(fitWithin(4032, 3024)).toEqual({ width: 1280, height: 960 });
  });

  it("conserve les proportions", () => {
    // Une image déformée serait pire qu'une image lourde : le modèle jugerait
    // une coupe qui n'existe pas.
    const source = { width: 3000, height: 2000 };
    const result = fitWithin(source.width, source.height);
    const ratioAvant = source.width / source.height;
    const ratioApres = result.width / result.height;

    expect(Math.abs(ratioAvant - ratioApres)).toBeLessThan(0.01);
  });

  it("ne grossit jamais une image déjà petite", () => {
    // L'agrandir n'ajouterait aucun détail et alourdirait le fichier.
    expect(fitWithin(800, 600)).toEqual({ width: 800, height: 600 });
    expect(fitWithin(1280, 720)).toEqual({ width: 1280, height: 720 });
  });

  it("ne rend jamais une dimension nulle", () => {
    // Une bannière très allongée verrait son petit côté tomber à 0 par arrondi,
    // et un canvas de hauteur nulle lève une exception.
    const result = fitWithin(10000, 3);
    expect(result.width).toBeGreaterThan(0);
    expect(result.height).toBeGreaterThan(0);
  });

  it("rend des entiers", () => {
    // Un canvas n'accepte pas une dimension fractionnaire.
    const result = fitWithin(3023, 4031);
    expect(Number.isInteger(result.width)).toBe(true);
    expect(Number.isInteger(result.height)).toBe(true);
  });

  it("ne dépasse jamais le plafond", () => {
    for (const [w, h] of [
      [4032, 3024],
      [3024, 4032],
      [8000, 100],
      [1281, 1281],
    ]) {
      const result = fitWithin(w, h);
      expect(Math.max(result.width, result.height)).toBeLessThanOrEqual(MAX_EDGE);
    }
  });

  it("ne fabrique rien sur une entrée absurde", () => {
    expect(fitWithin(0, 100)).toEqual({ width: 0, height: 0 });
    expect(fitWithin(Number.NaN, 100)).toEqual({ width: 0, height: 0 });
    expect(fitWithin(-10, 100)).toEqual({ width: 0, height: 0 });
  });
});

describe("replaceExtension", () => {
  it("passe le nom en .jpg puisque le contenu devient du JPEG", () => {
    expect(replaceExtension("IMG_4821.HEIC")).toBe("IMG_4821.jpg");
    expect(replaceExtension("tenue.png")).toBe("tenue.jpg");
  });

  it("gère un nom sans extension", () => {
    expect(replaceExtension("photo")).toBe("photo.jpg");
  });

  it("ne rend jamais un nom vide", () => {
    // Le nom sert à deviner le type côté serveur : « .jpg » seul serait lu
    // comme une extension vide.
    expect(replaceExtension(".HEIC")).toBe("photo.jpg");
  });
});
