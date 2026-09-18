// VAPID public key — safe to hardcode: it's sent to every browser as the
// applicationServerKey for a push subscription, same public-by-design
// reasoning as the Supabase anon key in lib/supabase/config.ts. Its
// private counterpart (VAPID_PRIVATE_KEY, server-only) lives in Vercel env
// vars and must never be committed.
export const VAPID_PUBLIC_KEY =
  "BLpuaSG21urIxsb1xXtg_ZcPIXnEq947KT9uUQDtrA4-gzxZ-SuYQCR0ade2zX3sMVK9iEOE4Dhfj3j1IKmlhFA";
