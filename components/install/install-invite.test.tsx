// @vitest-environment jsdom

/**
 * Les tests de l'invitation à installer, proposée après le verdict.
 *
 * ⚠️ Ce composant décide de deux choses qu'on ne peut pas rattraper :
 *
 *  1. Ne JAMAIS s'afficher à quelqu'un déjà entré par l'icône. Le lui montrer
 *     serait lui demander d'installer ce qu'il a déjà installé — le genre de
 *     détail qui fait douter du sérieux du produit.
 *  2. Ne JAMAIS revenir après un refus. L'invitation s'affiche sous un verdict,
 *     c'est-à-dire au seul moment où la personne est contente : insister y
 *     transforme un outil de rétention en raison de partir.
 *
 * Les deux reposent sur des API du navigateur (`matchMedia`, `localStorage`)
 * qu'aucun test en environnement `node` ne pouvait atteindre.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

/** `next/image` n'a rien à faire dans un test : on garde juste une balise. */
vi.mock("next/image", () => ({
  default: ({ src, alt }: { src: string; alt: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} />
  ),
}));

const { InstallInvite } = await import("./install-invite");

const DISMISSED_KEY = "vesti_install_invite_dismissed";
const OPEN_LABEL = "Ajouter à l'écran d'accueil";
const LATER_LABEL = "Plus tard";

/**
 * jsdom n'implémente pas `matchMedia`. On la pose nous-mêmes, ce qui permet
 * surtout de simuler les deux mondes : l'app lancée depuis l'icône, et la page
 * ouverte dans un navigateur.
 */
function setLaunchedFromIcon(standalone: boolean) {
  window.matchMedia = ((query: string) => ({
    matches: standalone && query.includes("standalone"),
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}

beforeEach(() => {
  window.localStorage.clear();
  setLaunchedFromIcon(false);
});

afterEach(cleanup);

describe("à qui l'invitation s'adresse", () => {
  it("reste invisible pour qui est déjà entré par l'icône", () => {
    setLaunchedFromIcon(true);

    const { container } = render(<InstallInvite />);

    expect(container.innerHTML).toBe("");
  });

  it("s'affiche, repliée, pour qui est dans un navigateur", () => {
    render(<InstallInvite />);

    expect(screen.getByText("Garde Vesti à portée de main")).toBeDefined();
    expect(screen.getByText(OPEN_LABEL)).toBeDefined();
    expect(screen.getByText(LATER_LABEL)).toBeDefined();
  });

  it("ne revient pas quand un refus a déjà été enregistré", () => {
    window.localStorage.setItem(DISMISSED_KEY, "1");

    const { container } = render(<InstallInvite />);

    expect(container.innerHTML).toBe("");
  });
});

describe("ce que font les deux boutons", () => {
  it("« Ajouter » déplie les instructions et retire les boutons", async () => {
    render(<InstallInvite />);

    await userEvent.click(screen.getByText(OPEN_LABEL));

    // Les instructions dépendent du navigateur détecté ; ce qui se vérifie
    // partout, c'est qu'on a quitté l'état replié.
    expect(screen.queryByText(OPEN_LABEL)).toBeNull();
    expect(screen.queryByText(LATER_LABEL)).toBeNull();
    expect(screen.getByText("Garde Vesti à portée de main")).toBeDefined();
  });

  it("« Plus tard » la retire, et l'écrit pour les fois suivantes", async () => {
    const { container } = render(<InstallInvite />);

    await userEvent.click(screen.getByText(LATER_LABEL));

    expect(container.innerHTML).toBe("");
    expect(window.localStorage.getItem(DISMISSED_KEY)).toBe("1");
  });

  it("le refus survit à un remontage — c'est tout l'objet du stockage", async () => {
    const first = render(<InstallInvite />);
    await userEvent.click(screen.getByText(LATER_LABEL));
    first.unmount();

    const { container } = render(<InstallInvite />);
    expect(container.innerHTML).toBe("");
  });
});

/**
 * Navigation privée, données de site bloquées ou effacées : l'accès au stockage
 * peut lever. L'invitation doit alors s'afficher plutôt que faire tomber
 * l'écran du verdict, qui est la seule chose que la personne est venue chercher.
 */
describe("quand le stockage est inaccessible", () => {
  it("s'affiche quand même si la lecture lève", () => {
    const getItem = vi
      .spyOn(Storage.prototype, "getItem")
      .mockImplementation(() => {
        throw new Error("stockage refusé");
      });

    expect(() => render(<InstallInvite />)).not.toThrow();
    expect(screen.getByText("Garde Vesti à portée de main")).toBeDefined();

    getItem.mockRestore();
  });

  it("se referme quand même si l'écriture lève", async () => {
    const setItem = vi
      .spyOn(Storage.prototype, "setItem")
      .mockImplementation(() => {
        throw new Error("stockage refusé");
      });

    const { container } = render(<InstallInvite />);
    await userEvent.click(screen.getByText(LATER_LABEL));

    // Le refus n'a pas pu être retenu, mais il est respecté pour cette session.
    expect(container.innerHTML).toBe("");

    setItem.mockRestore();
  });
});
