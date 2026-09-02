/**
 * Météo du jour via Open-Meteo : pas de clé API, pas de compte à créer.
 *
 * Le parsing et la mise en mots sont séparés de l'appel réseau pour rester
 * testables sans toucher au réseau.
 */

export interface WeatherSnapshot {
  temperature: number;
  minTemperature: number;
  maxTemperature: number;
  /** Code WMO renvoyé par Open-Meteo. */
  code: number;
  windSpeed: number;
  precipitationProbability: number;
  city: string | null;
}

/**
 * Codes WMO regroupés par ce qui change l'habillement. La pluie fine et
 * l'averse appellent la même réponse vestimentaire : inutile de distinguer 27
 * codes quand 8 familles suffisent.
 */
const WEATHER_LABELS: { max: number; min: number; label: string; icon: string }[] = [
  { min: 0, max: 0, label: "ciel dégagé", icon: "☀️" },
  { min: 1, max: 3, label: "nuageux", icon: "⛅" },
  { min: 45, max: 48, label: "brouillard", icon: "🌫️" },
  { min: 51, max: 57, label: "bruine", icon: "🌦️" },
  { min: 61, max: 67, label: "pluie", icon: "🌧️" },
  { min: 71, max: 77, label: "neige", icon: "❄️" },
  { min: 80, max: 82, label: "averses", icon: "🌦️" },
  { min: 85, max: 86, label: "averses de neige", icon: "🌨️" },
  { min: 95, max: 99, label: "orage", icon: "⛈️" },
];

export function describeCode(code: number): { label: string; icon: string } {
  const match = WEATHER_LABELS.find((entry) => code >= entry.min && code <= entry.max);
  return match ?? { label: "temps variable", icon: "🌥️" };
}

export function isWet(code: number): boolean {
  return (
    (code >= 51 && code <= 67) ||
    (code >= 71 && code <= 86) ||
    (code >= 95 && code <= 99)
  );
}

/**
 * Contraintes objectives déduites de la météo.
 *
 * Elles ne dictent pas la tenue — c'est le travail du styliste — mais elles
 * empêchent de passer à côté de l'évidence : proposer une veste en lin par 3°C,
 * ou du daim un jour de pluie.
 */
export function weatherConstraints(weather: WeatherSnapshot): string[] {
  const constraints: string[] = [];

  if (weather.maxTemperature <= 5) {
    constraints.push("il fait froid : il faut une vraie couche chaude, pas une surchemise");
  } else if (weather.maxTemperature <= 14) {
    constraints.push("il fait frais : prévoir une couche supplémentaire");
  } else if (weather.maxTemperature >= 27) {
    constraints.push("il fait chaud : privilégier les matières légères et respirantes");
  }

  if (weather.minTemperature <= 10 && weather.maxTemperature - weather.minTemperature >= 10) {
    constraints.push(
      "l'écart entre le matin et l'après-midi est important : une tenue à superposer vaut mieux qu'une pièce épaisse"
    );
  }

  if (isWet(weather.code) || weather.precipitationProbability >= 50) {
    constraints.push(
      "il risque de pleuvoir : éviter le daim et les matières fragiles, prévoir de quoi se couvrir"
    );
  }

  if (weather.windSpeed >= 30) {
    constraints.push("il y a du vent : éviter les pièces trop amples ou volantes");
  }

  return constraints;
}

/** Résumé court pour l'affichage. */
export function summarize(weather: WeatherSnapshot): string {
  const { label } = describeCode(weather.code);
  const place = weather.city ? `${weather.city} · ` : "";
  return `${place}${Math.round(weather.temperature)}°C, ${label}`;
}

interface OpenMeteoResponse {
  current?: {
    temperature_2m?: number;
    weather_code?: number;
    wind_speed_10m?: number;
  };
  daily?: {
    temperature_2m_min?: number[];
    temperature_2m_max?: number[];
    precipitation_probability_max?: number[];
  };
}

/** Transforme la réponse brute d'Open-Meteo, dont tous les champs sont optionnels. */
export function parseForecast(
  payload: OpenMeteoResponse,
  city: string | null
): WeatherSnapshot | null {
  const temperature = payload.current?.temperature_2m;
  const code = payload.current?.weather_code;

  // Sans température ni code, il n'y a rien à dire d'utile : mieux vaut ne rien
  // afficher que d'inventer une météo.
  if (typeof temperature !== "number" || typeof code !== "number") return null;

  return {
    temperature,
    minTemperature: payload.daily?.temperature_2m_min?.[0] ?? temperature,
    maxTemperature: payload.daily?.temperature_2m_max?.[0] ?? temperature,
    code,
    windSpeed: payload.current?.wind_speed_10m ?? 0,
    precipitationProbability: payload.daily?.precipitation_probability_max?.[0] ?? 0,
    city,
  };
}

const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";

export async function fetchWeather(
  latitude: number,
  longitude: number,
  city: string | null
): Promise<WeatherSnapshot | null> {
  const url = new URL(FORECAST_URL);
  url.searchParams.set("latitude", latitude.toFixed(2));
  url.searchParams.set("longitude", longitude.toFixed(2));
  url.searchParams.set("current", "temperature_2m,weather_code,wind_speed_10m");
  url.searchParams.set(
    "daily",
    "temperature_2m_min,temperature_2m_max,precipitation_probability_max"
  );
  url.searchParams.set("timezone", "auto");
  url.searchParams.set("forecast_days", "1");

  try {
    const response = await fetch(url, {
      // La météo du jour n'a pas besoin d'être rafraîchie à chaque requête.
      next: { revalidate: 1800 },
    });
    if (!response.ok) return null;
    return parseForecast(await response.json(), city);
  } catch {
    // Météo indisponible : l'app doit continuer sans, pas planter.
    return null;
  }
}
