// L'URL et la clé « anon » sont publiques par nature : Next les inline dans
// le bundle navigateur. Les lire ici, en un seul endroit, évite d'avoir
// `process.env.NEXT_PUBLIC_...!` disséminé partout avec un `!` qui masque
// une variable oubliée jusqu'au premier appel en production.
function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `Variable d'environnement manquante : ${name}. ` +
        "Copie .env.example vers .env.local et renseigne le projet Supabase.",
    );
  }
  return value;
}

export const SUPABASE_URL = required(
  "NEXT_PUBLIC_SUPABASE_URL",
  process.env.NEXT_PUBLIC_SUPABASE_URL,
);

export const SUPABASE_ANON_KEY = required(
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);
