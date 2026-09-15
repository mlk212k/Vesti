// @vitest-environment jsdom

/**
 * Les tests du parcours de jauges.
 *
 * `gauge.test.tsx` prouve qu'un curseur seul ne répond rien tant qu'on ne l'a
 * pas touché. Ce fichier prouve que le PARCOURS le respecte de bout en bout —
 * c'est-à-dire que ce qui est remonté après quatre écrans ne contient que les
 * réponses réellement données. Les deux sont nécessaires : un composant
 * irréprochable peut être branché sur un parent qui remplit les trous.
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { EMPTY_HABITS, GAUGE_SCREENS } from "@/lib/habits";
import { HabitsStep } from "./habits-step";

afterEach(cleanup);

function start() {
  const onDone = vi.fn();
  const onSkip = vi.fn();
  render(<HabitsStep onDone={onDone} onSkip={onSkip} pending={false} />);
  return { onDone, onSkip };
}

/** Passe à l'écran suivant, ou termine si c'est le dernier. */
function next() {
  const button =
    screen.queryByRole("button", { name: "Suivant" }) ??
    screen.getByRole("button", { name: /voir le résultat/i });
  fireEvent.click(button);
}

function slide(value: number, index = 0) {
  fireEvent.change(screen.getAllByRole("slider")[index], { target: { value: String(value) } });
}

describe("ce qui est remonté à la fin", () => {
  /**
   * ⚠️ LE test de ce fichier. Quatre écrans traversés sans toucher un seul
   * curseur : aucune réponse ne doit sortir. Si le parcours remontait les
   * positions de départ, on enregistrerait « 15 min, 2 fois, 60 €, 5 sur 10 »
   * pour quelqu'un qui n'a fait que taper « Suivant » — puis on le lui
   * annoncerait comme SES chiffres sur l'écran d'après.
   */
  it("traverser sans rien toucher ne répond rien du tout", () => {
    const { onDone } = start();
    for (let i = 0; i < GAUGE_SCREENS.length; i++) next();
    expect(onDone).toHaveBeenCalledWith(EMPTY_HABITS);
  });

  it("seules les jauges touchées sont remontées", () => {
    const { onDone } = start();
    slide(20); // écran 1 : le temps du matin
    for (let i = 0; i < GAUGE_SCREENS.length; i++) next();

    expect(onDone).toHaveBeenCalledWith({ ...EMPTY_HABITS, morning_minutes: 20 });
  });

  it("l'écran à deux jauges remonte bien les deux, séparément", () => {
    const { onDone } = start();
    next();
    next(); // écran 3 : budget + part portée
    expect(screen.getAllByRole("slider")).toHaveLength(2);

    slide(80, 0);
    slide(4, 1);
    next();
    next();

    expect(onDone).toHaveBeenCalledWith({
      ...EMPTY_HABITS,
      clothing_budget_eur: 80,
      worn_out_of_ten: 4,
    });
  });
});

describe("naviguer entre les écrans", () => {
  it("le retour ne perd pas ce qui a déjà été répondu", () => {
    const { onDone } = start();
    slide(20);
    next();
    fireEvent.click(screen.getByRole("button", { name: "Retour" }));

    // La réponse est toujours affichée, donc toujours en mémoire.
    expect(screen.getByText("20 min")).toBeDefined();

    for (let i = 0; i < GAUGE_SCREENS.length; i++) next();
    expect(onDone).toHaveBeenCalledWith({ ...EMPTY_HABITS, morning_minutes: 20 });
  });

  it("le retour permet de corriger une réponse", () => {
    const { onDone } = start();
    slide(20);
    next();
    fireEvent.click(screen.getByRole("button", { name: "Retour" }));
    slide(5);
    for (let i = 0; i < GAUGE_SCREENS.length; i++) next();

    expect(onDone).toHaveBeenCalledWith({ ...EMPTY_HABITS, morning_minutes: 5 });
  });

  it("il n'y a pas de retour sur le premier écran", () => {
    start();
    expect(screen.queryByRole("button", { name: "Retour" })).toBeNull();
  });

  it("le dernier écran propose de voir le résultat, pas « Suivant »", () => {
    start();
    for (let i = 0; i < GAUGE_SCREENS.length - 1; i++) next();
    expect(screen.getByRole("button", { name: /voir le résultat/i })).toBeDefined();
    expect(screen.queryByRole("button", { name: "Suivant" })).toBeNull();
  });
});

describe("le droit de ne pas répondre", () => {
  /**
   * ⚠️ Un questionnaire qui bloque sur une question de budget perd la personne
   * avant le compte. La porte de sortie est sur le premier écran, là où on
   * décide d'entrer ou non dans le questionnaire.
   */
  it("on peut quitter le questionnaire dès le premier écran", () => {
    const { onSkip, onDone } = start();
    fireEvent.click(screen.getByRole("button", { name: /passer les questions/i }));
    expect(onSkip).toHaveBeenCalled();
    expect(onDone).not.toHaveBeenCalled();
  });
});

describe("pendant l'enregistrement", () => {
  it("les boutons sont désactivés, pour ne pas enregistrer deux fois", () => {
    render(<HabitsStep onDone={vi.fn()} onSkip={vi.fn()} pending />);
    for (const button of screen.getAllByRole("button")) {
      expect((button as HTMLButtonElement).disabled).toBe(true);
    }
  });
});
