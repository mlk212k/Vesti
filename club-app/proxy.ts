import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    // Everything except Next static assets, images, the PWA manifest —
    // browsers fetch it unauthenticated to decide installability, and a
    // login redirect there breaks "Add to Home Screen" — and /api/cron/*,
    // which Vercel Cron calls with no user session at all; it does its
    // own CRON_SECRET check and must never hit this session redirect.
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|api/cron|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
