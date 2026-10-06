import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabasePublicConfig } from "@/lib/env";

/**
 * Supabase client for Server Components, Route Handlers and Server Actions. Uses the public anon
 * key plus the user's session cookies. Cookie writes are ignored when called from a Server
 * Component (read-only context); middleware refreshes the session cookies instead.
 */
export async function createSupabaseServerClient() {
  const { url, anonKey } = getSupabasePublicConfig();
  const cookieStore = await cookies();
  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) cookieStore.set(name, value, options);
        } catch {
          // Called from a Server Component: safe to ignore, middleware keeps the session fresh.
        }
      },
    },
  });
}
