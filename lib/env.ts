/**
 * Environment access. Secrets come from environment variables only (never source code).
 * NEXT_PUBLIC_* values are readable in the browser by design; everything else is server-only.
 */

export function getSupabasePublicConfig(): { url: string; anonKey: string } {
  // Referenced literally so Next.js can inline NEXT_PUBLIC_* values at build time.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error("Supabase is not configured: set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  }
  return { url, anonKey };
}

/** Server-only. Never import this from a client component. */
export function getServiceRoleKey(): string {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set (server-only secret).");
  return key;
}
