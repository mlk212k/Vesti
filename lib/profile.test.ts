import { describe, it, expect } from "vitest";
import { parseMeasure, HEIGHT_CM, WEIGHT_KG } from "./profile";

describe("parseMeasure", () => {
  it("accepte le vide : ces mesures sont facultatives", () => {
    // Forcer quelqu'un à inventer son poids pour pouvoir enregistrer son
    // prénom serait absurde — et c'est ce qui arriverait si le vide échouait.
    expect(parseMeasure("", HEIGHT_CM, "La taille")).toEqual({
      ok: true,
      value: null,
    });
    expect(parseMeasure("   ", WEIGHT_KG, "Le poids")).toEqual({
      ok: true,
      value: null,
    });
  });

  it("arrondit, parce que la colonne est entière", () => {
    expect(parseMeasure("178.4", HEIGHT_CM, "La taille")).toEqual({
      ok: true,
      value: 178,
    });
  });

  it("refuse hors des bornes de la base", () => {
    // ⚠️ Ces bornes ne sont pas décoratives : elles reprennent les contraintes
    // CHECK des migrations. Laisser passer une valeur hors bornes ne donne pas
    // une donnée farfelue, ça donne un rejet Postgres au moment d'enregistrer.
    expect(parseMeasure("99", HEIGHT_CM, "La taille").ok).toBe(false);
    expect(parseMeasure("251", HEIGHT_CM, "La taille").ok).toBe(false);
    expect(parseMeasure("29", WEIGHT_KG, "Le poids").ok).toBe(false);
  });

  it("refuse ce qui n'est pas un nombre", () => {
    for (const saisie of ["abc", "1,80", "", " "].slice(0, 2)) {
      expect(parseMeasure(saisie, HEIGHT_CM, "La taille").ok).toBe(false);
    }
  });

  it("nomme le champ dans le message, pas « la valeur »", () => {
    const resultat = parseMeasure("400", HEIGHT_CM, "La taille");
    expect(resultat.ok).toBe(false);
    if (!resultat.ok) {
      expect(resultat.message).toContain("La taille");
      expect(resultat.message).toContain("100");
      expect(resultat.message).toContain("250");
    }
  });
});
