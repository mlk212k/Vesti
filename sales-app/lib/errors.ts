// Les fonctions Postgres lèvent des codes stables (`NOT_ENOUGH_CARDS`…).
// Ici, et seulement ici, ils deviennent des phrases françaises. Les server
// actions n'inventent pas leurs propres messages : sinon la même erreur se
// raconte de trois façons différentes selon la page.

const MESSAGES: Record<string, string> = {
  AUTH_REQUIRED: "Session expirée. Reconnecte-toi.",
  FORBIDDEN: "Tu n'as pas les droits pour cette action.",
  FORBIDDEN_FIELD: "Ce champ ne peut être modifié que par le chef.",
  INVALID_QUANTITY: "Quantité invalide.",
  INVALID_PRICE: "Prix invalide.",
  INVALID_AMOUNT: "Montant invalide.",
  INVALID_PERIOD: "Période invalide.",
  INVALID_TARGET: "Destinataire invalide.",
  NOTE_REQUIRED: "Une justification est obligatoire pour une correction.",
  NOT_ENOUGH_STOCK: "Le stock du dépôt est insuffisant.",
  NOT_ENOUGH_CARDS: "Ce commercial n'a pas assez de cartes en main.",
  NO_OPEN_DAY: "Commence ta journée avant d'enregistrer une vente.",
  DAY_ALREADY_VALIDATED: "Cette journée est validée, elle ne peut plus bouger.",
  DAY_STILL_OPEN: "La journée doit être terminée avant d'être validée.",
  DAY_NOT_FOUND: "Journée introuvable.",
  SALE_NOT_FOUND: "Vente introuvable.",
  BUSINESS_NOT_FOUND: "Commerce introuvable.",
  MEMBER_NOT_FOUND: "Membre introuvable.",
  PAYOUT_NOT_FOUND: "Règlement introuvable ou déjà payé.",
  PROFILE_NOT_FOUND: "Profil introuvable.",
  NUDGE_TOO_SOON:
    "Déjà relancé dans l'heure. Laisse-lui le temps de réagir.",
};

export function translateError(error: unknown): string {
  const raw =
    typeof error === "string"
      ? error
      : error instanceof Error
        ? error.message
        : typeof error === "object" && error !== null && "message" in error
          ? String((error as { message: unknown }).message)
          : "";

  for (const [code, message] of Object.entries(MESSAGES)) {
    if (raw.includes(code)) return message;
  }

  // Contraintes de la base qui remontent sans passer par nos codes.
  if (raw.includes("work_days_one_per_day")) {
    return "Une journée est déjà enregistrée pour cette date.";
  }
  if (raw.includes("work_days_single_open_idx")) {
    return "Une journée est déjà en cours.";
  }
  if (raw.includes("duplicate key")) {
    return "Cet enregistrement existe déjà.";
  }

  return raw || "Une erreur est survenue.";
}

export type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

export function actionError(error: unknown): { ok: false; error: string } {
  return { ok: false, error: translateError(error) };
}
