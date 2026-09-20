import { SUPABASE_URL } from "@/lib/supabase/config";

// Le bucket des avatars est PUBLIC : l'URL se construit sans aller-retour
// réseau, contrairement aux preuves de vente qui exigent une URL signée.
//
// C'est un choix assumé — une photo de profil est vue par toute l'équipe des
// dizaines de fois par écran ; la signer à chaque rendu coûterait une requête
// par vignette pour protéger un portrait que tout le monde voit déjà.
export function urlAvatar(chemin: string | null | undefined): string | null {
  if (!chemin) return null;
  if (chemin.startsWith("http")) return chemin;
  return `${SUPABASE_URL}/storage/v1/object/public/avatars/${chemin}`;
}
