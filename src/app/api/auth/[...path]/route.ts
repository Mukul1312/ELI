/**
 * Neon Auth API route handler. Handles sign-in, sign-out, session, OAuth callbacks, etc.
 * Env: NEON_AUTH_BASE_URL (when not set, returns 503)
 */
const notConfigured = () =>
  Response.json({ error: 'Auth not configured' }, { status: 503 });

async function getHandlers() {
  if (!process.env.NEON_AUTH_BASE_URL) {
    return { GET: notConfigured, POST: notConfigured };
  }
  const { authApiHandler } = await import('@neondatabase/auth/next/server');
  return authApiHandler();
}

const handlersPromise = getHandlers();

export async function GET(req: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const handlers = await handlersPromise;
  return handlers.GET(req, ctx);
}

export async function POST(req: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const handlers = await handlersPromise;
  return handlers.POST(req, ctx);
}
