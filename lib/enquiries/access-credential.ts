import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

const TOKEN_BYTES = 32;
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const HASH_PATTERN = /^[0-9a-f]{64}$/;

/**
 * Create a high-entropy, URL-safe visitor access token.
 * Persist only tokenHash; return token to the caller for one-time presentation.
 */
export function createEnquiryAccessCredential(): {
  token: string;
  tokenHash: string;
} {
  const token = randomBytes(TOKEN_BYTES).toString("base64url");

  return {
    token,
    tokenHash: hashEnquiryAccessToken(token),
  };
}

/** SHA-256 digest for database storage. Never log the input token. */
export function hashEnquiryAccessToken(token: string): string {
  if (!isValidEnquiryAccessToken(token)) {
    throw new Error("Invalid enquiry access token format");
  }

  return createHash("sha256").update(token, "utf8").digest("hex");
}

/** Validate the encoded 256-bit token shape before hashing or comparing. */
export function isValidEnquiryAccessToken(token: string): boolean {
  return TOKEN_PATTERN.test(token);
}

/**
 * Verify a presented token against a stored digest.
 * Both digests are fixed-size before timingSafeEqual is called.
 */
export function verifyEnquiryAccessToken(
  token: string,
  expectedHash: string,
): boolean {
  if (!isValidEnquiryAccessToken(token) || !HASH_PATTERN.test(expectedHash)) {
    return false;
  }

  const actual = Buffer.from(hashEnquiryAccessToken(token), "hex");
  const expected = Buffer.from(expectedHash, "hex");

  return timingSafeEqual(actual, expected);
}
