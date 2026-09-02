import { describe, expect, it } from "vitest";
import { collectStoragePaths, isDeletionConfirmed, buildExport } from "./account";

describe("collectStoragePaths", () => {
  it("rassemble les photos des analyses et de la garde-robe", () => {
    const paths = collectStoragePaths(
      [{ image_paths: ["u/1.jpg", "u/2.jpg"] }],
      [{ source_image_path: "u/3.jpg" }]
    );
    expect(paths.sort()).toEqual(["u/1.jpg", "u/2.jpg", "u/3.jpg"]);
  });

  it("ne supprime pas deux fois la même photo", () => {
    // Plusieurs pièces d'une même tenue partagent la photo d'origine.
    const paths = collectStoragePaths(
      [{ image_paths: ["u/1.jpg"] }],
      [
        { source_image_path: "u/1.jpg" },
        { source_image_path: "u/1.jpg" },
        { source_image_path: "u/2.jpg" },
      ]
    );
    expect(paths.sort()).toEqual(["u/1.jpg", "u/2.jpg"]);
  });

  it("récupère une photo dont l'analyse a disparu", () => {
    // Sinon un fichier resterait orphelin dans le Storage après suppression.
    expect(collectStoragePaths([], [{ source_image_path: "u/seule.jpg" }])).toEqual([
      "u/seule.jpg",
    ]);
  });

  it("tolère les champs vides ou absents", () => {
    expect(
      collectStoragePaths(
        [{ image_paths: null }, { image_paths: [] }],
        [{ source_image_path: null }]
      )
    ).toEqual([]);
  });
});

describe("isDeletionConfirmed", () => {
  it("accepte le mot attendu, quelle que soit la casse", () => {
    expect(isDeletionConfirmed("SUPPRIMER")).toBe(true);
    expect(isDeletionConfirmed(" supprimer ")).toBe(true);
  });

  it("refuse tout le reste", () => {
    // Une suppression de compte est irréversible : elle ne doit jamais partir
    // sur un clic distrait.
    expect(isDeletionConfirmed("")).toBe(false);
    expect(isDeletionConfirmed("oui")).toBe(false);
    expect(isDeletionConfirmed("SUPPRIME")).toBe(false);
  });
});

describe("buildExport", () => {
  it("regroupe toutes les catégories de données", () => {
    const result = buildExport({
      userId: "u1",
      email: "moi@test.fr",
      profil: { gender: "femme" },
      analyses: [],
      items: [],
      suggestions: [],
      subscriptions: [],
      photoUrls: [{ chemin: "u/1.jpg", url_temporaire: "https://x" }],
      now: new Date("2026-03-20T10:00:00Z"),
    });

    expect(result.exported_at).toBe("2026-03-20T10:00:00.000Z");
    expect(result.compte).toEqual({ id: "u1", email: "moi@test.fr" });
    expect(Object.keys(result)).toEqual(
      expect.arrayContaining([
        "profil",
        "analyses",
        "garde_robe",
        "suggestions_achat",
        "abonnements",
        "photos",
      ])
    );
  });
});
