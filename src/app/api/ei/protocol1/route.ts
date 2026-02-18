/**
 * POST /api/ei/protocol1
 *
 * Runs Protocol 1 (Ignition): takes student check-in data, returns NegotiatedIntentIssued.
 * Emits AppOpen event first, then delegates to runProtocol1.
 *
 * Body: { studentId, topic, energy, sleepBucket?, pressure?, backlogPressure? }
 * Auth: Bearer <PILOT_SECRET>
 */

import { runProtocol1 } from '@/ei/protocol-runner';
import { appendEventTool } from '@/mastra/tools/event-store';
import { getEiRequestContext } from '@/ei/runtime/db';

export const dynamic = 'force-dynamic';

function isAuthorized(req: Request): boolean {
  const secret = process.env.PILOT_SECRET;
  if (!secret) return true;
  const header = req.headers.get('Authorization') ?? '';
  return header === `Bearer ${secret}`;
}

export async function POST(req: Request) {
  if (!isAuthorized(req)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { studentId, topic, energy, sleepBucket, pressure, backlogPressure } = body;
  if (!studentId || !topic || energy == null) {
    return Response.json({ error: 'Missing required fields: studentId, topic, energy' }, { status: 400 });
  }

  try {
    const ctx = getEiRequestContext();

    // Emit AppOpen event first so the event log includes the trigger
    await appendEventTool.execute!(
      {
        studentId,
        eventType: 'AppOpen' as const,
        payload: { energy, sleepBucket, pressure, backlogPressure, openedAt: new Date().toISOString() },
      },
      { requestContext: ctx as any },
    );

    const result = await runProtocol1(
      { studentId, topic, energy, sleepBucket, pressure, backlogPressure },
      ctx as any,
    );

    return Response.json(result);
  } catch (err: any) {
    console.error('[POST /api/ei/protocol1]', err);
    return Response.json({ error: err?.message ?? 'Internal error' }, { status: 500 });
  }
}
