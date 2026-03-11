/**
 * Neon Auth server instance for API routes and server components.
 * Uses createNeonAuth (Better Auth) when NEON_AUTH_BASE_URL and NEON_AUTH_COOKIE_SECRET are set.
 *
 * Includes in-memory session cache to avoid repeated HTTP calls to Neon Auth.
 * The SDK's cookie-based cache (__Secure-neon-auth.local.session_data) is only minted
 * during auth handler responses (login/sign-up), not by getSession() itself.
 * Without this cache, every server-side getSession() makes a ~1000ms HTTP round-trip.
 * See docs/engineering-ddd-design/06-infrastructure-optimization.md §4.
 *
 * Env: NEON_AUTH_BASE_URL, NEON_AUTH_COOKIE_SECRET
 */
import { createNeonAuth } from '@neondatabase/auth/next/server';
import { cookies } from 'next/headers';
import type { GetSessionFn } from '@/lib/cohort-access';

const hasAuthEnv =
  !!process.env.NEON_AUTH_BASE_URL && !!process.env.NEON_AUTH_COOKIE_SECRET;

/** Neon Auth instance. Null when env is not configured. */
export const auth = hasAuthEnv
  ? createNeonAuth({
      baseUrl: process.env.NEON_AUTH_BASE_URL!,
      cookies: { secret: process.env.NEON_AUTH_COOKIE_SECRET! },
    })
  : null;

const NEON_SESSION_TOKEN_COOKIE = '__Secure-neon-auth.session_token';
const SESSION_CACHE_TTL_MS = 4 * 60 * 1000; // 4 minutes (under SDK's 300s cookie TTL)

type CachedSession = { user: { id: string }; session: { userId: string } };
const sessionCache = new Map<string, { data: CachedSession; exp: number }>();

/** GetSessionFn that reads from Neon Auth with in-memory caching. */
export function createServerGetSession(): GetSessionFn {
  return async () => {
    if (!auth) return null;

    const token = (await cookies()).get(NEON_SESSION_TOKEN_COOKIE)?.value;

    if (token) {
      const cached = sessionCache.get(token);
      if (cached && cached.exp > Date.now()) return cached.data;
    }

    try {
      const { data } = await auth.getSession();
      if (!data?.user?.id) return null;
      const result: CachedSession = {
        user: { id: data.user.id },
        session: {
          userId:
            (data as { session?: { userId?: string } }).session?.userId ??
            data.user.id,
        },
      };

      if (token) {
        sessionCache.set(token, { data: result, exp: Date.now() + SESSION_CACHE_TTL_MS });
        if (sessionCache.size > 100) {
          const now = Date.now();
          for (const [k, v] of sessionCache) {
            if (v.exp <= now) sessionCache.delete(k);
          }
        }
      }

      return result;
    } catch {
      return null;
    }
  };
}
