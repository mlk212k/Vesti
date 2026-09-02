import { describe, expect, it } from "vitest";
import {
  describeCode,
  isWet,
  parseForecast,
  summarize,
  weatherConstraints,
  type WeatherSnapshot,
} from "./weather";

function snapshot(partial: Partial<WeatherSnapshot> = {}): WeatherSnapshot {
  return {
    temperature: 18,
    minTemperature: 14,
    maxTemperature: 22,
    code: 1,
    windSpeed: 10,
    precipitationProbability: 10,
    city: "Lyon",
    ...partial,
  };
}

describe("describeCode", () => {
  it("regroupe les codes WMO par famille", () => {
    expect(describeCode(0).label).toBe("ciel dégagé");
    expect(describeCode(2).label).toBe("nuageux");
    expect(describeCode(63).label).toBe("pluie");
    expect(describeCode(96).label).toBe("orage");
  });

  it("retombe sur un libellé neutre pour un code inconnu", () => {
    expect(describeCode(4242).label).toBe("temps variable");
  });
});

describe("isWet", () => {
  it("détecte les temps qui mouillent", () => {
    expect(isWet(61)).toBe(true); // pluie
    expect(isWet(73)).toBe(true); // neige
    expect(isWet(95)).toBe(true); // orage
  });

  it("laisse passer le sec", () => {
    expect(isWet(0)).toBe(false);
    expect(isWet(3)).toBe(false);
    expect(isWet(45)).toBe(false); // brouillard : gênant mais pas mouillant
  });
});

describe("weatherConstraints", () => {
  it("impose une vraie couche par grand froid", () => {
    const constraints = weatherConstraints(
      snapshot({ maxTemperature: 2, minTemperature: -3 })
    );
    expect(constraints.join(" ")).toContain("froid");
  });

  it("recommande les matières légères par forte chaleur", () => {
    const constraints = weatherConstraints(
      snapshot({ maxTemperature: 31, minTemperature: 20 })
    );
    expect(constraints.join(" ")).toContain("légères");
  });

  it("conseille de superposer quand l'amplitude du jour est forte", () => {
    const constraints = weatherConstraints(
      snapshot({ minTemperature: 6, maxTemperature: 20 })
    );
    expect(constraints.join(" ")).toContain("superposer");
  });

  it("prévient pour la pluie même quand le code est sec mais la probabilité haute", () => {
    const constraints = weatherConstraints(
      snapshot({ code: 3, precipitationProbability: 70 })
    );
    expect(constraints.join(" ")).toContain("pleuvoir");
  });

  it("ne dit rien quand la journée est sans contrainte", () => {
    expect(
      weatherConstraints(
        snapshot({ maxTemperature: 20, minTemperature: 16, code: 1, windSpeed: 8 })
      )
    ).toEqual([]);
  });
});

describe("parseForecast", () => {
  it("lit une réponse complète", () => {
    const result = parseForecast(
      {
        current: { temperature_2m: 7.4, weather_code: 61, wind_speed_10m: 22 },
        daily: {
          temperature_2m_min: [4],
          temperature_2m_max: [9],
          precipitation_probability_max: [80],
        },
      },
      "Paris"
    );

    expect(result).toEqual({
      temperature: 7.4,
      minTemperature: 4,
      maxTemperature: 9,
      code: 61,
      windSpeed: 22,
      precipitationProbability: 80,
      city: "Paris",
    });
  });

  it("se rabat sur la température courante si les min/max manquent", () => {
    const result = parseForecast(
      { current: { temperature_2m: 12, weather_code: 0 } },
      null
    );
    expect(result?.minTemperature).toBe(12);
    expect(result?.maxTemperature).toBe(12);
    expect(result?.windSpeed).toBe(0);
  });

  it("renvoie null plutôt qu'une météo inventée quand l'essentiel manque", () => {
    expect(parseForecast({}, "Lyon")).toBeNull();
    expect(parseForecast({ current: { temperature_2m: 15 } }, "Lyon")).toBeNull();
  });
});

describe("summarize", () => {
  it("compose un résumé lisible", () => {
    expect(summarize(snapshot({ temperature: 7.6, code: 61 }))).toBe("Lyon · 8°C, pluie");
  });

  it("se passe de la ville quand elle est inconnue", () => {
    expect(summarize(snapshot({ city: null, temperature: 20, code: 0 }))).toBe(
      "20°C, ciel dégagé"
    );
  });
});
