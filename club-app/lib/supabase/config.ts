// Anon/publishable keys are meant to be public — they're already inlined
// into the browser bundle by NEXT_PUBLIC_* at build time, so there's no
// security downside to committing them here directly. Hardcoded (rather
// than read from process.env) because the Vercel dashboard value kept
// coming out wrong from mobile copy/paste on a ~200-character token, and a
// non-empty-but-wrong env var would silently win over any `||` fallback.
// Update these two lines if the Supabase project is ever recreated.
export const SUPABASE_URL = "https://oxmewaomaebfvgvokppt.supabase.co";

export const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im94bWV3YW9tYWViZnZndm9rcHB0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk2NzMyMzYsImV4cCI6MjEwNTI0OTIzNn0.bwX-XRqcH6RYj28ysCbuOcOznlzEBkzSELeDiDyFPgE";
