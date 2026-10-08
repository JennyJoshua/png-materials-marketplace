/**
 * Environment access. Secrets come from environment variables only (never source code).
 * NEXT_PUBLIC_* values are readable in the browser by design; everything else is server-only.
 *
 * Missing or invalid configuration throws a ConfigError. Its message names the variables that are
 * wrong, never their values, so it is safe to log and (in development) to show.
 */

export class ConfigError extends Error {
  readonly missing: string[];

  constructor(message: string, missing: string[] = []) {
    super(message);
    this.name = "ConfigError";
    this.missing = missing;
  }
}

function clean(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export function getSupabasePublicConfig(): { url: string; anonKey: string } {
  // Referenced literally so Next.js can inline NEXT_PUBLIC_* values at build time.
  const url = clean(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const anonKey = clean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  const missing: string[] = [];
  if (!url) missing.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!anonKey) missing.push("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  if (missing.length > 0) {
    throw new ConfigError(
      `Supabase is not configured: ${missing.join(" and ")} ${missing.length > 1 ? "are" : "is"} empty or missing. ` +
        "Fill them in .env, then stop and restart the dev server.",
      missing,
    );
  }

  try {
    const parsed = new URL(url!);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") throw new Error("protocol");
  } catch {
    throw new ConfigError(
      "NEXT_PUBLIC_SUPABASE_URL is not a valid URL. Expected the Project URL from Supabase, like https://<project-ref>.supabase.co",
      ["NEXT_PUBLIC_SUPABASE_URL"],
    );
  }
  return { url: url!, anonKey: anonKey! };
}

/** Server-only. Never import this from a client component. */
export function getServiceRoleKey(): string {
  const key = clean(process.env.SUPABASE_SERVICE_ROLE_KEY);
  if (!key) {
    throw new ConfigError("SUPABASE_SERVICE_ROLE_KEY is empty or missing (server-only secret).", ["SUPABASE_SERVICE_ROLE_KEY"]);
  }
  return key;
}
