/**
 * GET /api/ei/events?studentId=<id>&limit=50&eventTypes=AppOpen,IntentSet
 *
 * Returns raw event history for a student. Debug / data-review endpoint.
 * Requires Authorization: Bearer <PILOT_SECRET> (same as write endpoint).
 */

import { queryEventsTool } from '@/mastra/tools/event-store';
import { getEiRequestContext } from '@/ei/runtime/db';

export const dynamic = 'force-dynamic';

function isAuthorized(req: Request): boolean {
  const secret = process.env.PILOT_SECRET;
  if (!secret) return true;
  const header = req.headers.get('Authorization') ?? '';
  return header === `Bearer ${secret}`;
}

export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(req.url);
  const studentId = url.searchParams.get('studentId');
  if (!studentId) {
    return Response.json({ error: 'studentId query param is required' }, { status: 400 });
  }

  const limitParam = url.searchParams.get('limit');
  const eventTypesParam = url.searchParams.get('eventTypes');
  const topicId = url.searchParams.get('topicId') ?? undefined;
  const since = url.searchParams.get('since') ?? undefined;
  const until = url.searchParams.get('until') ?? undefined;

  try {
    const ctx = getEiRequestContext();
    const result = await queryEventsTool.execute!(
      {
        studentId,
        filters: {
          limit: limitParam ? parseInt(limitParam, 10) : 100,
          eventTypes: eventTypesParam ? eventTypesParam.split(',') : undefined,
          topicId,
          since,
          until,
        },
      },
      { requestContext: ctx as any },
    );
    return Response.json(result);
  } catch (err: any) {
    console.error('[GET /api/ei/events]', err);
    return Response.json({ error: err?.message ?? 'Internal error' }, { status: 500 });
  }
}
