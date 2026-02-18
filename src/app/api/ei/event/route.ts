/**
 * POST /api/ei/event
 *
 * Appends a student event to ei_events and updates ei_topic_state as needed.
 * This is the primary data-collection endpoint for the student pilot.
 *
 * Auth: expects `Authorization: Bearer <PILOT_SECRET>` header.
 * Set PILOT_SECRET env var. If not set, auth is skipped (dev/local only).
 *
 * Body: matches appendEventTool inputSchema
 *   { studentId, eventType, topicId?, payload?, occurredAt? }
 *
 * Response 200: { eventId, occurredAt }
 * Response 400: { error: string }
 * Response 401: { error: "Unauthorized" }
 * Response 500: { error: string }
 */

import { appendEventTool } from '@/mastra/tools/event-store';
import { getEiRequestContext } from '@/ei/runtime/db';

export const dynamic = 'force-dynamic';

function isAuthorized(req: Request): boolean {
  const secret = process.env.PILOT_SECRET;
  if (!secret) return true; // auth disabled when env var is not set (dev only)
  const header = req.headers.get('Authorization') ?? '';
  return header === `Bearer ${secret}`;
}

export async function POST(req: Request) {
  if (!isAuthorized(req)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  try {
    const ctx = getEiRequestContext();
    const result = await appendEventTool.execute!(body as any, { requestContext: ctx as any });
    return Response.json(result);
  } catch (err: any) {
    if (err?.name === 'ZodError') {
      return Response.json({ error: 'Validation failed', details: err.errors }, { status: 400 });
    }
    console.error('[POST /api/ei/event]', err);
    return Response.json({ error: err?.message ?? 'Internal error' }, { status: 500 });
  }
}
