import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "./config";

// Client « service_role » : il IGNORE la RLS. Il ne sert qu'à trois choses
// que la clé publique ne peut pas faire :
//
//   1. créer/supprimer un compte (l'admin crée les comptes des commerciaux) ;
//   2. fixer le rôle d'un profil ;
//   3. compter les tentatives de connexion ratées (voir migration 0005).
//
// `server-only` en tête de fichier : si un composant client l'importe par
// erreur, le build casse au lieu d'expédier la clé au navigateur.
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY manquante : la création de comptes et la " +
        "limitation des connexions en dépendent.",
    );
  }

  return createSupabaseClient(SUPABASE_URL, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
