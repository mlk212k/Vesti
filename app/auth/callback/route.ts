import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/navigation";

/**
 * Point d'atterrissage de l'OAuth Google : échange le code contre une session,
 * puis renvoie l'utilisateur là où il allait.
 *
 * La connexion par email ne passe plus par ici — elle se fait par un code à
 * 6 chiffres saisi dans l'app (voir `lib/otp.ts`). Cette route reste ouverte
 * dans `lib/install.ts` : Google renvoie dans le navigateur, jamais depuis
 * l'icône de l'écran d'accueil.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeNext(searchParams.get("next"));

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=connexion_invalide`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(`${origin}/login?error=connexion_expiree`);
  }

  return NextResponse.redirect(`${origin}${next}`);
}
