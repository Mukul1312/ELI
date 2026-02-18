/**
 * GET /api/ei/aggregates?studentId=<id>
 *
 * Recomputes and returns 7-day derived signals for a student.
 * Also persists the result to ei_student_aggregates.
 * Debug / admin endpoint.
 */

import { computeAggregatesTool } from '@/mastra/tools/signal-compute';
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

  try {
    const ctx = getEiRequestContext();
    const result = await computeAggregatesTool.execute!({ studentId }, { requestContext: ctx as any });
    return Response.json(result);
  } catch (err: any) {
    console.error('[GET /api/ei/aggregates]', err);
    return Response.json({ error: err?.message ?? 'Internal error' }, { status: 500 });
  }
}
