// @vitest-environment jsdom

/**
 * Les tests qui manquaient à la validation automatique du code partenaire.
 *
 * ⚠️ Pourquoi ils existent : ce composant a été livré en production sans
 * qu'aucun test ne le couvre. Il est pourtant le PREMIER écran que voit chaque
 * inscrit, et il décide de l'attribution d'une commission — une attribution
 * définitive, que `referred_by` n'autorise à écrire qu'une fois. Une régression
 * ici ne se voit pas : elle produit des filleuls sans parrain, silencieusement.
 *
 * L'environnement DOM est déclaré par le commentaire en tête de fichier plutôt
 * que dans `vitest.config.mts` : les 243 autres tests tournent en `node`, et
 * leur imposer un navigateur les ralentirait sans rien leur apporter.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

/**
 * L'action serveur est remplacée : l'importer pour de vrai tirerait le client
 * Supabase, `next/headers` et toute la chaîne d'authentification. Ce qu'on
 * teste ici, c'est ce que le composant FAIT de la réponse, pas la réponse.
 */
const submitReferralCode = vi.fn();
vi.mock("@/app/(auth)/onboarding/actions", () => ({
  submitReferralCode: (code: string) => submitReferralCode(code),
}));

const { ReferralStep } = await import("./referral-step");

beforeEach(() => {
  submitReferralCode.mockReset();
});

afterEach(cleanup);

describe("code venu d'un lien partenaire (pré-rempli)", () => {
  it("part tout seul et franchit l'étape, sans jamais montrer le formulaire", async () => {
    submitReferralCode.mockResolvedValue({ accepted: true, reason: null });
    const onDone = vi.fn();

    render(<ReferralStep initialCode="4WPZM2" onDone={onDone} />);

    expect(await screen.findByText("Code validé")).toBeDefined();
    expect(submitReferralCode).toHaveBeenCalledWith("4WPZM2");

    // Le cœur du correctif : aucun bouton à appuyer, donc aucun bouton à rater.
    expect(screen.queryByText("Valider le code")).toBeNull();
    expect(screen.queryByText("Je n'ai pas de code")).toBeNull();

    await waitFor(() => expect(onDone).toHaveBeenCalled());
  });

  it("n'envoie le code qu'une fois, même si React monte l'effet deux fois", async () => {
    submitReferralCode.mockResolvedValue({ accepted: true, reason: null });

    render(<ReferralStep initialCode="4WPZM2" onDone={vi.fn()} />);

    await screen.findByText("Code validé");
    expect(submitReferralCode).toHaveBeenCalledTimes(1);
  });

  it("compte déjà parrainé : l'étape est franchie en silence", async () => {
    submitReferralCode.mockResolvedValue({
      accepted: false,
      reason: "already_referred",
    });
    const onDone = vi.fn();

    render(<ReferralStep initialCode="4WPZM2" onDone={onDone} />);

    await waitFor(() => expect(onDone).toHaveBeenCalled());
    // Une attribution est définitive : réafficher l'étape n'aurait aucun objet.
    expect(screen.queryByText("Un code est déjà enregistré sur ton compte.")).toBeNull();
  });

  /**
   * ⚠️ Le test qui protège la règle la plus facile à casser par mégarde.
   *
   * Personne n'a rien tapé : afficher « Ce code n'est pas valide » accuserait
   * quelqu'un d'une faute qu'il n'a pas commise, sur l'écran d'accueil de son
   * inscription.
   */
  it("code invalide : retombe sur le champ manuel SANS message d'erreur", async () => {
    submitReferralCode.mockResolvedValue({
      accepted: false,
      reason: "unknown_code",
    });

    render(<ReferralStep initialCode="PERIME" onDone={vi.fn()} />);

    expect(await screen.findByText("Valider le code")).toBeDefined();
    expect(screen.queryByText("Ce code n'est pas valide.")).toBeNull();
  });

  it("son propre code : le champ est vidé plutôt que de laisser une erreur", async () => {
    submitReferralCode.mockResolvedValue({
      accepted: false,
      reason: "self_referral",
    });

    render(<ReferralStep initialCode="4WPZM2" onDone={vi.fn()} />);

    await screen.findByText("Valider le code");
    const field = screen.getByPlaceholderText("Ton code") as HTMLInputElement;
    expect(field.value).toBe("");
    expect(screen.queryByText("C'est ton propre code.")).toBeNull();
  });
});

describe("arrivée sans lien", () => {
  it("montre le formulaire et n'appelle rien", () => {
    render(<ReferralStep initialCode="" onDone={vi.fn()} />);

    expect(screen.getByText("Valider le code")).toBeDefined();
    expect(screen.getByText("Je n'ai pas de code")).toBeDefined();
    expect(submitReferralCode).not.toHaveBeenCalled();
  });

  it("saisie manuelle refusée : là, l'erreur s'affiche", async () => {
    submitReferralCode.mockResolvedValue({
      accepted: false,
      reason: "unknown_code",
    });

    render(<ReferralStep initialCode="" onDone={vi.fn()} />);

    await userEvent.type(screen.getByPlaceholderText("Ton code"), "NIMPORTEQUOI");
    await userEvent.click(screen.getByText("Valider le code"));

    // Ici quelqu'un a tapé quelque chose : le silence serait incompréhensible.
    expect(await screen.findByText("Ce code n'est pas valide.")).toBeDefined();
  });

  it("« Je n'ai pas de code » passe l'étape sans rien envoyer", async () => {
    const onDone = vi.fn();
    render(<ReferralStep initialCode="" onDone={onDone} />);

    await userEvent.click(screen.getByText("Je n'ai pas de code"));

    expect(onDone).toHaveBeenCalled();
    expect(submitReferralCode).not.toHaveBeenCalled();
  });
});
