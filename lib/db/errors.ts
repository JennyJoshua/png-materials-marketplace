/**
 * Recognises errors raised by Prisma while talking to PostgreSQL: connection and configuration
 * problems (for example an invalid DATABASE_URL), missing tables, and failed requests.
 *
 * PrismaClientValidationError is deliberately NOT included: it means the code built a bad query,
 * which is a bug to fix, not an outage to report as "temporarily unavailable".
 */
const DATABASE_ERROR_NAMES = new Set([
  "PrismaClientInitializationError",
  "PrismaClientKnownRequestError",
  "PrismaClientUnknownRequestError",
  "PrismaClientRustPanicError",
]);

export function isDatabaseError(error: unknown): boolean {
  return error instanceof Error && DATABASE_ERROR_NAMES.has(error.name);
}
