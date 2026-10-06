import { createClient } from "@supabase/supabase-js";
import { getServiceRoleKey, getSupabasePublicConfig } from "@/lib/env";

/**
 * PRIVILEGED Supabase client using the service-role key. It bypasses RLS and can write
 * app_metadata. Server-side only: import it exclusively from Route Handlers / server code, never
 * from a "use client" file (tests/static-security.test.ts enforces this).
 */
export function createSupabaseAdminClient() {
  const { url } = getSupabasePublicConfig();
  return createClient(url, getServiceRoleKey(), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
