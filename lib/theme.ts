/**
 * Choix du thème : clair, sombre, ou celui du téléphone.
 *
 * Le choix vit dans `localStorage`, pas en base : il appartient à l'appareil.
 * Quelqu'un qui règle son téléphone en sombre le soir et consulte l'app depuis
 * un ordinateur en plein jour ne veut pas le même thème des deux côtés, et un
 * réglage synchronisé sur le compte lui imposerait celui du dernier écran
 * utilisé.
 */
export const THEME_KEY = "vesti_theme";

export type ThemeChoice = "system" | "light" | "dark";

export const THEME_CHOICES: { value: ThemeChoice; label: string }[] = [
  { value: "system", label: "Système" },
  { value: "light", label: "Clair" },
  { value: "dark", label: "Sombre" },
];

export function isThemeChoice(value: unknown): value is ThemeChoice {
  return value === "system" || value === "light" || value === "dark";
}

/**
 * Le script qui pose le choix sur `<html>` AVANT le premier rendu.
 *
 * ⚠️ Il doit tourner en bloquant, dans le `<head>`. Appliqué après coup, la
 * page s'affiche d'abord dans le thème du système puis bascule sous les yeux —
 * un éclair blanc à chaque ouverture pour qui a choisi le sombre.
 *
 * Écrit à la main plutôt que généré : c'est du code qui part tel quel dans le
 * HTML, il doit rester lisible et sans dépendance.
 */
export const THEME_SCRIPT = `
try {
  var choice = localStorage.getItem(${JSON.stringify(THEME_KEY)});
  if (choice === "light" || choice === "dark") {
    document.documentElement.setAttribute("data-theme", choice);
  }
} catch (e) {
  // Stockage refusé (navigation privée) : on garde le thème du système.
}
`.trim();

/** Applique un choix immédiatement, et le retient pour les prochaines visites. */
export function applyTheme(choice: ThemeChoice): void {
  const root = document.documentElement;

  // « Système » retire l'attribut au lieu d'en poser un : c'est son absence qui
  // rend la main à `prefers-color-scheme`.
  if (choice === "system") {
    root.removeAttribute("data-theme");
  } else {
    root.setAttribute("data-theme", choice);
  }

  try {
    localStorage.setItem(THEME_KEY, choice);
  } catch {
    // Sans stockage, le choix vaut pour cette visite seulement.
  }
}

/** Le choix retenu, ou « système » si rien n'a jamais été choisi. */
export function readTheme(): ThemeChoice {
  try {
    const stored = localStorage.getItem(THEME_KEY);
    return isThemeChoice(stored) ? stored : "system";
  } catch {
    return "system";
  }
}
