import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { syncAppUser } from "@/lib/auth/session";
import { postLoginPath } from "@/lib/roles";

/**
 * Landing point for the e-mail confirmation link (PKCE flow). Exchanges the one-time code for a
 * session, then creates/activates the application profile (Option B safety net: this also repairs
 * a profile that failed to be created at registration).
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  if (!code) return NextResponse.redirect(`${origin}/login?error=callback`);

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user) return NextResponse.redirect(`${origin}/login?error=callback`);

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
}
