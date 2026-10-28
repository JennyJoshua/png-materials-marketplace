import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { syncAppUser } from "@/lib/auth/session";
import { postLoginPath } from "@/lib/roles";
import { logServerError } from "@/lib/security/log";

/**
 * Landing point for the e-mail confirmation link (PKCE flow). Exchanges the one-time code for a
 * session, then creates/activates the application profile (Option B safety net: this also repairs
 * a profile that failed to be created at registration).
 *
 * If the application cannot finish (for example the database is unreachable) the session is ended
 * and the user sees a clear notice on the sign-in page instead of an error page.
 */
export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  // Render can give the app an internal request URL (for example localhost:10000). Use the
  // explicitly configured public site origin for browser redirects, falling back only when absent.
  let origin = requestUrl.origin;
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    try {
      origin = new URL(process.env.NEXT_PUBLIC_SITE_URL).origin;
    } catch {
      // Keep the request origin as a fallback if the optional setting is malformed.
    }
  }

  const { searchParams } = requestUrl;
  const code = searchParams.get("code");
  if (!code) return NextResponse.redirect(`${origin}/login?error=callback`);

  let supabase: Awaited<ReturnType<typeof createSupabaseServerClient>> | undefined;
  let exchanged = false;
  try {
    supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error || !data.user) return NextResponse.redirect(`${origin}/login?error=callback`);
    exchanged = true;

    const appUser = await syncAppUser(data.user);
    if (!appUser) {
      await supabase.auth.signOut();
      return NextResponse.redirect(`${origin}/login?error=profile`);
    }
    if (appUser.status === "SUSPENDED") {
      await supabase.auth.signOut();
      return NextResponse.redirect(`${origin}/login?error=suspended`);
    }
    return NextResponse.redirect(`${origin}${postLoginPath(appUser.role, searchParams.get("next"))}`);
  } catch (unexpected) {
    logServerError("auth callback: unexpected failure", unexpected);
    if (exchanged && supabase) {
      try {
        await supabase.auth.signOut();
      } catch {
        // best effort
      }
    }
    return NextResponse.redirect(`${origin}/login?error=unavailable`);
  }
}
