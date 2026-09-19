"use client";

import { useState } from "react";
import type { ActionResult } from "@/lib/errors";

/**
 * Panneau dépliable qui se referme quand l'action a réussi.
 *
 * Le réflexe serait d'écrire `useEffect(() => { if (ok) fermer() })`. C'est
 * précisément ce que React déconseille : un `setState` dans un effet
 * provoque un rendu en cascade (et la règle `react-hooks/set-state-in-effect`
 * le refuse).
 *
 * La bonne forme est l'ajustement d'état PENDANT le rendu : on garde une
 * trace du dernier état d'action observé, et quand il change pour un succès,
 * on referme. React relance simplement le rendu du composant, sans passer
 * par le DOM ni par un effet.
 */
export function usePanneau<T extends ActionResult<unknown> | undefined>(
  etat: T,
): [boolean, (ouvert: boolean) => void] {
  const [ouvert, setOuvert] = useState(false);
  const [dernierEtat, setDernierEtat] = useState<T>(etat);

  if (etat !== dernierEtat) {
    setDernierEtat(etat);
    if (etat?.ok) setOuvert(false);
  }

  return [ouvert, setOuvert];
}
