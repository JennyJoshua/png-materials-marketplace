import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { User } from "@supabase/supabase-js";
import { getSupabasePublicConfig } from "@/lib/env";

/**
 * Refreshes the Supabase session cookies and verifies the identity with getUser() (which
 * validates the token with Supabase Auth; getSession() would only read the cookie).
 */
export async function updateSession(request: NextRequest): Promise<{ response: NextResponse; user: User | null }> {
  const { url, anonKey } = getSupabasePublicConfig();
  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
      },
    },
  });

  const { data, error } = await supabase.auth.getUser();
  return { response, user: error ? null : data.user };
}

/** Redirect while keeping any refreshed session cookies from `source`. */
export function redirectWithCookies(url: URL, source: NextResponse): NextResponse {
  const redirect = NextResponse.redirect(url);
  for (const cookie of source.cookies.getAll()) redirect.cookies.set(cookie);
  return redirect;
}
