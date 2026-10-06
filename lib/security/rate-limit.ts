/**
 * Simple fixed-window, IN-MEMORY rate limiter (Phase 1 foundation).
 *
 * Limitations - this is NOT distributed protection:
 *  - it only counts requests seen by ONE running instance;
 *  - counters reset whenever the Render instance restarts or redeploys;
 *  - running several instances multiplies the effective limit.
 * Supabase Auth additionally rate-limits its own authentication endpoints. A shared store
 * (e.g. Redis/Upstash) can replace this module later without changing callers.
 */
export type RateLimitResult = { allowed: boolean; remaining: number; retryAfterSeconds: number };

export type RateLimiter = {
  check: (key: string) => RateLimitResult;
  reset: () => void;
};

export function createRateLimiter(options: { limit: number; windowMs: number; now?: () => number }): RateLimiter {
  const { limit, windowMs } = options;
  const now = options.now ?? Date.now;
  const hits = new Map<string, { count: number; resetAt: number }>();

  return {
    check(key) {
      const t = now();
      if (hits.size > 10_000) {
        for (const [k, v] of hits) if (v.resetAt <= t) hits.delete(k);
      }
      let entry = hits.get(key);
      if (!entry || entry.resetAt <= t) {
        entry = { count: 0, resetAt: t + windowMs };
        hits.set(key, entry);
      }
      entry.count += 1;
      const allowed = entry.count <= limit;
      return {
        allowed,
        remaining: Math.max(0, limit - entry.count),
        retryAfterSeconds: Math.max(1, Math.ceil((entry.resetAt - t) / 1000)),
      };
    },
    reset() {
      hits.clear();
    },
  };
}

const g = globalThis as unknown as { __pngLimiters?: Record<string, RateLimiter> };
g.__pngLimiters ??= {};

function shared(name: string, limit: number, windowMs: number): RateLimiter {
  const store = (g.__pngLimiters ??= {});
  return (store[name] ??= createRateLimiter({ limit, windowMs }));
}

/** 5 sign-ups per IP per hour. */
export const registerLimiter = shared("register", 5, 60 * 60 * 1000);
/** 10 sign-in attempts per IP + e-mail per 15 minutes. */
export const loginLimiter = shared("login", 10, 15 * 60 * 1000);
/** 40 sign-in attempts per IP per 15 minutes (covers credential stuffing across many e-mails). */
export const loginIpLimiter = shared("login-ip", 40, 15 * 60 * 1000);
