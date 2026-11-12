import { handleLogin } from "@/lib/auth/login";

export async function POST(request: Request) {
  return handleLogin(request, "SUPPLIER");
}
