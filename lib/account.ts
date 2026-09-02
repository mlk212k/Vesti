/**
 * Export et suppression de compte (RGPD art. 15, 17 et 20).
 *
 * Fonctions pures : la collecte des chemins de fichiers et la mise en forme de
 * l'export se testent sans base ni stockage.
 */

export interface AnalysisExport {
  id: string;
  kind: string;
  image_paths: string[] | null;
  verdict: unknown;
  score: number | null;
  occasion: string | null;
  created_at: string;
}

export interface ItemExport {
  id: string;
  category: string;
  label: string;
  source_image_path: string | null;
  created_at: string;
}

/**
 * Tous les fichiers appartenant à l'utilisateur.
 *
 * ⚠️ C'est la fonction qui évite le pire bug de cette fonctionnalité : la
 * suppression en cascade de Postgres efface les lignes, **pas les fichiers du
 * Storage**. Sans cette collecte, les photos d'une personne resteraient stockées
 * après la suppression de son compte.
 *
 * Deux sources, parce qu'une pièce de garde-robe peut pointer vers une photo
 * dont l'analyse a été supprimée entre-temps.
 */
export function collectStoragePaths(
  analyses: Pick<AnalysisExport, "image_paths">[],
  items: Pick<ItemExport, "source_image_path">[]
): string[] {
  const paths = new Set<string>();

  for (const analysis of analyses) {
    for (const path of analysis.image_paths ?? []) {
      if (path) paths.add(path);
    }
  }

  for (const item of items) {
    if (item.source_image_path) paths.add(item.source_image_path);
  }

  return [...paths];
}

export interface AccountExport {
  exported_at: string;
  compte: { id: string; email: string | null };
  profil: Record<string, unknown>;
  analyses: AnalysisExport[];
  garde_robe: ItemExport[];
  suggestions_achat: unknown[];
  abonnements: unknown[];
  photos: { chemin: string; url_temporaire: string | null }[];
  note: string;
}

/**
 * Assemble l'export. Les photos ne sont pas encodées dans le JSON — ce serait
 * plusieurs dizaines de mégaoctets — mais accompagnées d'un lien de
 * téléchargement temporaire.
 */
export function buildExport(input: {
  userId: string;
  email: string | null;
  profil: Record<string, unknown>;
  analyses: AnalysisExport[];
  items: ItemExport[];
  suggestions: unknown[];
  subscriptions: unknown[];
  photoUrls: { chemin: string; url_temporaire: string | null }[];
  now: Date;
}): AccountExport {
  return {
    exported_at: input.now.toISOString(),
    compte: { id: input.userId, email: input.email },
    profil: input.profil,
    analyses: input.analyses,
    garde_robe: input.items,
    suggestions_achat: input.suggestions,
    abonnements: input.subscriptions,
    photos: input.photoUrls,
    note: "Les liens de téléchargement des photos expirent après une heure. Relance un export pour en obtenir de nouveaux.",
  };
}

/** Confirmation exigée avant suppression, insensible à la casse et aux espaces. */
export const DELETE_CONFIRMATION = "SUPPRIMER";

export function isDeletionConfirmed(input: string): boolean {
  return input.trim().toUpperCase() === DELETE_CONFIRMATION;
}
