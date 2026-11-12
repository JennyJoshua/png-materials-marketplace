import { handleLogin } from "@/app/api/auth/login/route";

/** Administrator-only sign-in; the shared handler verifies the database role after Supabase authentication. */
export async function POST(request: Request) {
  return handleLogin(request, "ADMIN");
}
