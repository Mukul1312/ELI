/**
 * POST /api/ei/protocol1
 *
 * Runs Protocol 1 (Ignition): takes student check-in data, returns NegotiatedIntentIssued.
 * Emits AppOpen event first, then delegates to RunP1GateHandler.
 *
 * Body: { studentId, topic, energy, sleepBucket?, pressure?, backlogPressure? }
 * Auth: ResolveAuthSession (session) or Bearer <PILOT_SECRET> fallback (body studentId)
 */

import { eiStore } from '@/ei/runtime/db';
import { PostgresGetStudentSignalsAdapter } from '@/ei/infrastructure/persistence/get-student-signals.pg';
import { PostgresAppendEventAdapter } from '@/ei/infrastructure/persistence/append-event.pg';
import { AssessLoopHealthHandler } from '@/ei/application/assess-loop-health/handler';
import { RunP1GateHandler } from '@/ei/application/run-p1-gate/handler';
import { ProtocolEngine } from '@/ei/domain/study-session/protocol-engine';
import { withEiSession } from '@/app/api/ei/with-session';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { studentId: bodyStudentId, topic, energy, sleepBucket, pressure, backlogPressure } = body;

  const authResult = await withEiSession(req, bodyStudentId);
  if (!authResult.authorized) {
    return authResult.response;
  }
  const studentId = authResult.studentId;

  if (!studentId || !topic || energy == null) {
    return Response.json({ error: 'Missing required fields: studentId, topic, energy' }, { status: 400 });
  }

  try {
    const db = eiStore.db;
    const appendEvent = new PostgresAppendEventAdapter(db);
    const signalsPort = new PostgresGetStudentSignalsAdapter(db);
    const assessLoopHealth = new AssessLoopHealthHandler(signalsPort, { now: () => new Date() });
    const protocolEngine = new ProtocolEngine();

    await appendEvent.append({
      studentId,
      eventType: 'AppOpen',
      topicId: topic,
      payload: { energy, sleepBucket, pressure, backlogPressure, openedAt: new Date().toISOString() },
    });

    const handler = new RunP1GateHandler(signalsPort, assessLoopHealth, appendEvent, protocolEngine);
    const result = await handler.execute({
      studentId,
      topicId: topic,
      sessionId: crypto.randomUUID(),
      energy,
      sleepBucket,
      pressure,
      backlogPressure,
    });

    return Response.json(result);
  } catch (err: any) {
    console.error('[POST /api/ei/protocol1]', err);
    return Response.json({ error: err?.message ?? 'Internal error' }, { status: 500 });
  }
}
