"use client";

import { useFormStatus } from "react-dom";

// Bouton de soumission qui connaît l'état du formulaire parent. Évite de
// remonter un `pending` à la main dans chaque écran.
export function Submit({
  children,
  className = "btn btn-primaire w-full py-3",
  pendingLabel = "…",
}: {
  children: React.ReactNode;
  className?: string;
  pendingLabel?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button type="submit" className={className} disabled={pending}>
      {pending ? pendingLabel : children}
    </button>
  );
}
