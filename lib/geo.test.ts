import { describe, it, expect } from "vitest";
import { coarseLocation } from "./geo";

describe("coarseLocation", () => {
  it("arrondit au centième de degré", () => {
    // ⚠️ C'est la promesse de confidentialité, pas un détail de format : à
    // pleine précision, la colonne contiendrait l'adresse du domicile de chaque
    // personne inscrite. Ce test est là pour que personne ne « simplifie » en
    // enregistrant la valeur brute.
    expect(coarseLocation(48.85661, 2.35222)).toEqual({
      latitude: 48.86,
      longitude: 2.35,
    });
  });

  it("arrondit aussi les positions négatives", () => {
    expect(coarseLocation(-33.8688, -151.2093)).toEqual({
      latitude: -33.87,
      longitude: -151.21,
    });
  });

  it("laisse tranquille ce qui est déjà sur la grille", () => {
    expect(coarseLocation(48.86, 2.35)).toEqual({
      latitude: 48.86,
      longitude: 2.35,
    });
  });

  it("refuse une position impossible plutôt que de la corriger", () => {
    // La ramener aux bornes rangerait quelqu'un au pôle Nord et lui donnerait
    // une météo parfaitement crédible. Un refus se voit.
    expect(coarseLocation(200, 2)).toBeNull();
    expect(coarseLocation(48, -181)).toBeNull();
    expect(coarseLocation(-91, 0)).toBeNull();
  });

  it("refuse ce qui n'est pas un nombre fini", () => {
    expect(coarseLocation("48.86", "2.35")).toBeNull();
    expect(coarseLocation(NaN, 2)).toBeNull();
    expect(coarseLocation(Infinity, 2)).toBeNull();
    expect(coarseLocation(null, null)).toBeNull();
    expect(coarseLocation(undefined, undefined)).toBeNull();
  });

  it("accepte le point zéro, qui est une position valable", () => {
    // `0` est faux au sens booléen : un test écrit avec `if (!latitude)`
    // rejetterait le golfe de Guinée. Il fallait le verrouiller.
    expect(coarseLocation(0, 0)).toEqual({ latitude: 0, longitude: 0 });
  });
});
