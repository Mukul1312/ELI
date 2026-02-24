/**
 * Rate limiting for EI command endpoint.
 * Uses @upstash/ratelimit when UPSTASH_REDIS_REST_* env vars are set.
 * No-op (always allows) when not configured (e.g. local dev).
 */

export type RateLimitResult =
  | { allowed: true }
  | { allowed: false; retryAfter: number };

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

const RATE_LIMIT_AUTH = 60; // requests per window
const RATE_LIMIT_ANON = 10;
const WINDOW_SEC = 60;

type Limiter = { limit: (id: string) => Promise<{ success: boolean; reset: number }> };
let limiterAuth: Limiter | null = null;
let limiterAnon: Limiter | null = null;
let initPromise: Promise<void> | null = null;

async function initLimiters(): Promise<void> {
  if (limiterAuth) return;
  if (!UPSTASH_URL || !UPSTASH_TOKEN) return;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const { Ratelimit } = await import('@upstash/ratelimit');
    const { Redis } = await import('@upstash/redis');
    const redis = new Redis({ url: UPSTASH_URL, token: UPSTASH_TOKEN });

    limiterAuth = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(RATE_LIMIT_AUTH, `${WINDOW_SEC} s`),
      analytics: false,
    }) as Limiter;

    limiterAnon = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(RATE_LIMIT_ANON, `${WINDOW_SEC} s`),
      analytics: false,
    }) as Limiter;
  })();
  return initPromise;
}

export async function checkRateLimit(
  studentId: string | null,
  ip: string,
): Promise<RateLimitResult> {
  await initLimiters();
  const identifier = studentId ? `student:${studentId}` : `ip:${ip}`;
  const limiter = studentId ? limiterAuth : limiterAnon;
  if (!limiter) return { allowed: true };

  const result = await limiter.limit(identifier);
  if (result.success) return { allowed: true };
  const retryAfter = Math.max(0, Math.ceil((result.reset - Date.now()) / 1000));
  return { allowed: false, retryAfter };
}
