/**
 * Neon Auth API route handler. Handles sign-in, sign-out, session, OAuth callbacks, etc.
 * Env: NEON_AUTH_BASE_URL, NEON_AUTH_COOKIE_SECRET (when not set, returns 503)
 */
import { auth } from '@/lib/auth/server';

const notConfigured = () =>
  Response.json({ error: 'Auth not configured' }, { status: 503 });

const handlers = auth ? auth.handler() : null;

export async function GET(
  req: Request,
  ctx: { params: Promise<{ path: string[] }> }
) {
  if (!handlers) return notConfigured();
  return handlers.GET(req, ctx);
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ path: string[] }> }
) {
  if (!handlers) return notConfigured();
  return handlers.POST(req, ctx);
}
