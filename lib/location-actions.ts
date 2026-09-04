"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { coarseLocation } from "@/lib/geo";

/**
 * Enregistre la position, arrondie côté serveur.
 *
 * ⚠️ L'arrondi ne peut pas rester chez le client. Le composant qui lit le GPS
 * arrondissait lui-même avant d'écrire en base — donc la promesse « on ne garde
 * pas ta position exacte » ne tenait qu'à la bonne volonté du navigateur, et
 * n'importe quel appel forgé pouvait enregistrer l'adresse du domicile. Voir
 * `lib/geo.ts`.
 */
export async function updateLocation(
  latitude: number,
  longitude: number
): Promise<{ ok: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const coarse = coarseLocation(latitude, longitude);
  if (!coarse) return { ok: false };

  const { error } = await supabase
    .from("profiles")
    .update({ latitude: coarse.latitude, longitude: coarse.longitude })
    .eq("id", user.id);

  if (error) return { ok: false };

  // L'accueil décide d'afficher « Que mettre aujourd'hui ? » selon la présence
  // d'une position : sans ça, il continuerait à réclamer la localisation.
  revalidatePath("/compte");
  revalidatePath("/dashboard");

  return { ok: true };
}
