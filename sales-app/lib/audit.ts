// Traduction des actions du journal d'audit.
//
// Les codes stockés sont stables et machine-lisibles (`sale.created`) ; les
// phrases ci-dessous ne servent qu'à l'affichage. Une action inconnue
// s'affiche telle quelle plutôt que de disparaître : un audit qui masque ce
// qu'il ne reconnaît pas ne vaut rien.

export const AUDIT_LABEL: Record<string, string> = {
  "auth.login": "Connexion",
  "auth.logout": "Déconnexion",
  "auth.password_changed": "Mot de passe modifié",
  "workday.started": "Journée commencée",
  "workday.ended": "Journée terminée",
  "workday.reopened": "Journée rouverte",
  "workday.validated": "Journée validée",
  "sale.created": "Vente enregistrée",
  "sale.updated": "Vente corrigée",
  "sale.deleted": "Vente annulée",
  "business.created": "Commerce créé",
  "business.updated": "Commerce modifié",
  "business.deleted": "Commerce supprimé",
  "cards.allocated": "Cartes attribuées",
  "cards.returned": "Cartes rendues",
  "cards.lost": "Cartes perdues",
  "stock.restocked": "Entrée de stock",
  "stock.adjusted": "Inventaire corrigé",
  "member.created": "Compte créé",
  "member.updated": "Compte modifié",
  "member.password_reset": "Mot de passe réinitialisé",
  "settings.updated": "Paramètres modifiés",
  "commission.created": "Commission calculée",
  "commission.paid": "Commission réglée",
};

export function auditLabel(action: string): string {
  return AUDIT_LABEL[action] ?? action;
}

// Regroupement pour le filtre : on ne propose pas trente cases à cocher.
export const AUDIT_FAMILLES: Record<string, string[]> = {
  Connexions: ["auth.login", "auth.logout", "auth.password_changed"],
  Journées: [
    "workday.started",
    "workday.ended",
    "workday.reopened",
    "workday.validated",
  ],
  Ventes: ["sale.created", "sale.updated", "sale.deleted"],
  Cartes: [
    "cards.allocated",
    "cards.returned",
    "cards.lost",
    "stock.restocked",
    "stock.adjusted",
  ],
  Comptes: ["member.created", "member.updated", "member.password_reset"],
  Réglages: ["settings.updated", "commission.created", "commission.paid"],
};
