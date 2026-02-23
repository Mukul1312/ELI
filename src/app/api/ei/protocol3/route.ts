/**
 * POST /api/ei/protocol3
 *
 * Runs Protocol 3 (Verification): takes session-end data, returns VerificationDecisionIssued.
 *
 * Body: { studentId, topic, endedAt }
 * Auth: Bearer <PILOT_SECRET>
 */

import { eiStore } from '@/ei/runtime/db';
import { PostgresGetStudentSignalsAdapter } from '@/ei/infrastructure/persistence/get-student-signals.pg';
import { PostgresAppendEventAdapter } from '@/ei/infrastructure/persistence/append-event.pg';
import { PostgresQueryEventsAdapter } from '@/ei/infrastructure/persistence/query-events.pg';
import { AssessLoopHealthHandler } from '@/ei/application/assess-loop-health/handler';
import { RunP3GateHandler } from '@/ei/application/run-p3-gate/handler';
import { ProtocolEngine } from '@/ei/domain/study-session/protocol-engine';

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

  const { studentId, topic, endedAt } = body;
  if (!studentId || !topic || !endedAt) {
    return Response.json({ error: 'Missing required fields: studentId, topic, endedAt' }, { status: 400 });
  }

  try {
    const db = eiStore.db;
    const signalsPort = new PostgresGetStudentSignalsAdapter(db);
    const appendEvent = new PostgresAppendEventAdapter(db);
    const queryEvents = new PostgresQueryEventsAdapter(db);
    const assessLoopHealth = new AssessLoopHealthHandler(signalsPort, { now: () => new Date() });
    const protocolEngine = new ProtocolEngine();

    const handler = new RunP3GateHandler(signalsPort, assessLoopHealth, appendEvent, queryEvents, protocolEngine);
    const result = await handler.execute({
      studentId,
      topicId: topic,
      sessionId: crypto.randomUUID(),
      endedAt,
    });

    return Response.json(result);
  } catch (err: any) {
    console.error('[POST /api/ei/protocol3]', err);
    return Response.json({ error: err?.message ?? 'Internal error' }, { status: 500 });
  }
}
