// @vitest-environment jsdom

/**
 * Les tests de la jauge.
 *
 * ⚠️ Un seul comportement compte ici, et ce n'est pas l'apparence : UN CURSEUR
 * QU'ON N'A PAS TOUCHÉ NE RÉPOND RIEN.
 *
 * Le curseur démarre au milieu de sa barre. Cette position ressemble à une
 * réponse sans en être une. Si le composant la remontait au parent, on
 * enregistrerait « 15 minutes » pour des gens qui ont simplement tapé
 * « Suivant » — puis l'écran d'après leur annoncerait « 91 heures par an,
 * d'après toi ». Ce serait une donnée inventée, rendue à son prétendu auteur.
 *
 * Rien dans le code ne casse si cette règle saute : la jauge continue de
 * fonctionner, et la base se remplit tranquillement de valeurs par défaut. Elle
 * ne tient que par ces tests.
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Gauge } from "./gauge";

afterEach(cleanup);

const BOUNDS = { min: 0, max: 45 };

function renderGauge(props: Partial<React.ComponentProps<typeof Gauge>> = {}) {
  const onChange = vi.fn();
  render(
    <>
      <h2 id="q">Le matin, tu passes combien de temps ?</h2>
      <Gauge
        value={null}
        onChange={onChange}
        bounds={BOUNDS}
        start={15}
        step={1}
        format={(v) => `${v} min`}
        ends={["Rien", "45 min et plus"]}
        labelledBy="q"
        {...props}
      />
    </>
  );
  return { onChange, slider: screen.getByRole("slider") as HTMLInputElement };
}

describe("tant qu'on n'a pas répondu", () => {
  it("la position du pouce n'est jamais affichée comme une réponse", () => {
    renderGauge();
    // Le pouce est à 15 : rien à l'écran ne dit « 15 min ».
    expect(screen.queryByText("15 min")).toBeNull();
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("le lecteur d'écran entend « pas encore répondu », pas un nombre", () => {
    const { slider } = renderGauge();
    expect(slider.getAttribute("aria-valuetext")).toBe("Pas encore répondu");
  });

  it("l'écran dit comment répondre", () => {
    renderGauge();
    expect(screen.getByText(/fais glisser/i)).toBeDefined();
  });

  /**
   * Le pouce est bien au départ prévu — c'est l'AFFICHAGE qui ne prétend pas
   * que ça veut dire quelque chose, pas la position.
   */
  it("le pouce est quand même posé à la position de départ", () => {
    const { slider } = renderGauge();
    expect(slider.value).toBe("15");
  });
});

describe("dès qu'on a répondu", () => {
  it("la valeur remonte au parent", () => {
    const { onChange, slider } = renderGauge();
    fireEvent.change(slider, { target: { value: "30" } });
    expect(onChange).toHaveBeenCalledWith(30);
  });

  it("le nombre remonté est un nombre, pas la chaîne du champ", () => {
    const { onChange, slider } = renderGauge();
    fireEvent.change(slider, { target: { value: "7" } });
    expect(onChange.mock.calls[0][0]).toBe(7);
  });

  it("la valeur s'affiche, formatée", () => {
    renderGauge({ value: 30 });
    expect(screen.getByText("30 min")).toBeDefined();
  });

  /**
   * ⚠️ Sans `aria-valuetext`, le lecteur d'écran annonce « 30 » : un nombre nu
   * dont on ne sait pas s'il s'agit de minutes, d'euros ou d'une note sur 10.
   */
  it("le lecteur d'écran entend l'unité", () => {
    const { slider } = renderGauge({ value: 30 });
    expect(slider.getAttribute("aria-valuetext")).toBe("30 min");
  });

  it("la consigne disparaît", () => {
    renderGauge({ value: 30 });
    expect(screen.queryByText(/fais glisser/i)).toBeNull();
  });

  it("zéro est une réponse, pas une absence de réponse", () => {
    // Piège classique : `value || defaut` traiterait 0 comme « pas répondu ».
    renderGauge({ value: 0, format: (v) => (v === 0 ? "Aucun" : `${v} min`) });
    expect(screen.getByText("Aucun")).toBeDefined();
    expect(screen.queryByText(/fais glisser/i)).toBeNull();
  });
});

describe("le curseur reste utilisable au clavier et au lecteur d'écran", () => {
  it("il est nommé par la question, pas par un libellé inventé", () => {
    renderGauge();
    expect(screen.getByRole("slider", { name: /le matin/i })).toBeDefined();
  });

  it("ses bornes sont exposées", () => {
    const { slider } = renderGauge();
    expect(slider.min).toBe("0");
    expect(slider.max).toBe("45");
  });

  it("les deux extrémités sont écrites sous la barre", () => {
    renderGauge();
    expect(screen.getByText("Rien")).toBeDefined();
    expect(screen.getByText("45 min et plus")).toBeDefined();
  });
});
