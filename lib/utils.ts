import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Fusionne des classes Tailwind en laissant la dernière gagner.
 *
 * ⚠️ Ce fichier existe pour les composants installés depuis un registre shadcn,
 * qui importent tous `@/lib/utils`. Il n'est PAS le style de la maison : les
 * composants de Vesti composent leurs classes à la main (`components/ui/`), et
 * `buttonClasses` reste la source unique de la chaîne du bouton.
 *
 * L'intérêt de `twMerge` sur un simple `clsx` : il résout les conflits entre
 * utilitaires de la même famille. `cn("px-2", "px-4")` rend `px-4`, là où une
 * concaténation naïve laisserait les deux et s'en remettrait à l'ordre du
 * fichier CSS — c'est-à-dire au hasard.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
