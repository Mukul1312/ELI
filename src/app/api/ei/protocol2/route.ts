/**
 * POST /api/ei/protocol2
 *
 * Runs Protocol 2 (Activation): takes intent-set data, returns ActivationPlanIssued.
 *
 * Body: { studentId, topic, taskType?, setAt }
 * Auth: ResolveAuthSession (session) or Bearer <PILOT_SECRET> fallback (body studentId)
 */

import { eiStore } from '@/ei/runtime/db';
import { PostgresGetStudentSignalsAdapter } from '@/ei/infrastructure/persistence/get-student-signals.pg';
import { PostgresAppendEventAdapter } from '@/ei/infrastructure/persistence/append-event.pg';
import { PostgresQueryEventsAdapter } from '@/ei/infrastructure/persistence/query-events.pg';
import { AssessLoopHealthHandler } from '@/ei/application/assess-loop-health/handler';
import { RunP2GateHandler } from '@/ei/application/run-p2-gate/handler';
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

  const { studentId: bodyStudentId, topic, taskType, setAt } = body;

  const authResult = await withEiSession(req, bodyStudentId);
  if (!authResult.authorized) {
    return authResult.response;
  }
  const studentId = authResult.studentId;

  if (!studentId || !topic || !setAt) {
    return Response.json({ error: 'Missing required fields: studentId, topic, setAt' }, { status: 400 });
  }

  try {
    const db = eiStore.db;
    const signalsPort = new PostgresGetStudentSignalsAdapter(db);
    const appendEvent = new PostgresAppendEventAdapter(db);
    const queryEvents = new PostgresQueryEventsAdapter(db);
    const assessLoopHealth = new AssessLoopHealthHandler(signalsPort, { now: () => new Date() });
    const protocolEngine = new ProtocolEngine();

    const handler = new RunP2GateHandler(signalsPort, assessLoopHealth, appendEvent, queryEvents, protocolEngine);
    const result = await handler.execute({
      studentId,
      topicId: topic,
      sessionId: crypto.randomUUID(),
      setAt,
      taskType,
    });

    return Response.json(result);
  } catch (err: any) {
    console.error('[POST /api/ei/protocol2]', err);
    return Response.json({ error: err?.message ?? 'Internal error' }, { status: 500 });
  }
}
