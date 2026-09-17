import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Supabase OAuth / magic-link redirect handler. Exchanges the ?code=... for a
// session cookie, then sends the user to ?next=... (or /dashboard).
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next");
  const dest = next && next.startsWith("/") ? next : "/dashboard";

  if (code) {
    const supabase = await createClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(new URL(dest, url.origin));
}
