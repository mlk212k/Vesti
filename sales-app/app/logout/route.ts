import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Déconnexion en POST uniquement : en GET, un simple <img src="/logout">
// posé dans un message suffirait à déconnecter la personne qui le lit.
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  await supabase.rpc("log_audit", { p_action: "auth.logout" });
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/login", request.nextUrl.origin), {
    status: 303,
  });
}
