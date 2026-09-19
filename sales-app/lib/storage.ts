import "server-only";

import { createClient } from "@/lib/supabase/server";

// Le bucket `proofs` est privé : une photo ne s'affiche qu'au travers d'une
// URL signée, valable une heure. On en génère une au moment du rendu plutôt
// que de stocker des liens publics — un lien public resterait valable pour
// toujours, pour n'importe qui l'ayant vu passer.
export async function signedProofUrl(
  path: string | null,
  seconds = 3600,
): Promise<string | null> {
  if (!path) return null;

  const supabase = await createClient();
  const { data } = await supabase.storage
    .from("proofs")
    .createSignedUrl(path, seconds);

  return data?.signedUrl ?? null;
}

export async function signedProofUrls(
  paths: (string | null)[],
): Promise<Map<string, string>> {
  const unique = [...new Set(paths.filter((p): p is string => Boolean(p)))];
  if (unique.length === 0) return new Map();

  const supabase = await createClient();
  const { data } = await supabase.storage
    .from("proofs")
    .createSignedUrls(unique, 3600);

  const result = new Map<string, string>();
  for (const entry of data ?? []) {
    if (entry.path && entry.signedUrl) result.set(entry.path, entry.signedUrl);
  }
  return result;
}
