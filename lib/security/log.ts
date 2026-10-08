/**
 * Server-side error logging that is useful for diagnosis but safe to read: credentials, tokens and
 * connection-string passwords are redacted, the text is flattened to one short line, and no stack
 * trace or request data is printed. Never send this output to the browser.
 */

const MAX_LENGTH = 400;

export function redact(text: string): string {
  return text
    .replace(/eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}(?:\.[A-Za-z0-9_-]+)?/g, "[jwt]")
    .replace(/\b(postgres(?:ql)?|mysql|https?):\/\/[^\s:@/]+:[^\s@]+@/gi, "$1://[credentials]@")
    .replace(/\b(password|passwd|pwd|secret|token|api[_-]?key|apikey)(\s*[=:]\s*)\S+/gi, "$1$2[redacted]")
    .replace(/\b(?:sb_secret_|sbp_)[A-Za-z0-9_-]+/g, "[key]");
}

/** One-line description of an error: "Name (code): message". Prisma messages keep the final cause lines. */
export function describeError(error: unknown): string {
  if (!(error instanceof Error)) return "a non-Error value was thrown";
  const code = (error as { code?: unknown }).code;
  const lines = error.message
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const kept = lines.length <= 3 ? lines : [lines[0], ...lines.slice(-2)];
  const head = `${error.name}${typeof code === "string" || typeof code === "number" ? ` (${code})` : ""}`;
  return redact(`${head}: ${kept.join(" ")}`).slice(0, MAX_LENGTH);
}

export function logServerError(scope: string, error: unknown): void {
  console.error(`[${scope}] ${describeError(error)}`);
}
