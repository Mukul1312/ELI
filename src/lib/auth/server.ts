/**
 * Neon Auth server instance for API routes and server components.
 * Use auth.getSession() to retrieve the current session (reads cookies from request context).
 *
 * Env: NEON_AUTH_BASE_URL
 */
import { createAuthServer } from '@neondatabase/auth/next/server';
import type { GetSessionFn } from '@/lib/cohort-access';

const hasAuthEnv = !!process.env.NEON_AUTH_BASE_URL;

export const auth = hasAuthEnv ? createAuthServer() : null;

/** GetSessionFn that reads from Neon Auth. Returns null when auth is not configured. */
export function createServerGetSession(): GetSessionFn {
  return async () => {
    if (!auth) return null;
    try {
      const { data } = await auth.getSession();
      if (!data?.user?.id) return null;
      return {
        user: { id: data.user.id },
        session: { userId: (data as { session?: { userId?: string } }).session?.userId ?? data.user.id },
      };
    } catch {
      return null;
    }
  };
}
