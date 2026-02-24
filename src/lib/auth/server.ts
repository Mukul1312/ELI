/**
 * Neon Auth server instance for API routes and server components.
 * Uses createNeonAuth (Better Auth) when NEON_AUTH_BASE_URL and NEON_AUTH_COOKIE_SECRET are set.
 *
 * Env: NEON_AUTH_BASE_URL, NEON_AUTH_COOKIE_SECRET
 */
import { createNeonAuth } from '@neondatabase/auth/next/server';
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

/** GetSessionFn that reads from Neon Auth. Returns null when auth is not configured. */
export function createServerGetSession(): GetSessionFn {
  return async () => {
    if (!auth) return null;
    try {
      const { data } = await auth.getSession();
      if (!data?.user?.id) return null;
      return {
        user: { id: data.user.id },
        session: {
          userId:
            (data as { session?: { userId?: string } }).session?.userId ??
            data.user.id,
        },
      };
    } catch {
      return null;
    }
  };
}
