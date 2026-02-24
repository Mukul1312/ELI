/**
 * POST /api/ei/command
 *
 * Command-based EI entry point. Client sends a command (AppOpen, IntentSet, SessionEnd);
 * Runtime decides which protocol to run based on session state and invokes the
 * corresponding Mastra workflow.
 *
 * Body: { commandType: 'AppOpen' | 'IntentSet' | 'SessionEnd', payload: {...} }
 * Auth: Neon Auth session (required)
 */

import { eiStore } from '@/ei/runtime/db';
import { PostgresQueryEventsAdapter } from '@/ei/infrastructure/persistence/query-events.pg';
import { ProtocolRouter } from '@/ei/application/ei-protocol-router';
import { EiCommandSchema } from '@/ei/application/ei-protocol-router';
import { withEiSession } from '@/app/api/ei/with-session';
import { protocol1IgnitionWorkflow } from '@/mastra/workflows/protocol1-ignition';
import { protocol2ActivationWorkflow } from '@/mastra/workflows/protocol2-activation';
import { protocol3VerificationWorkflow } from '@/mastra/workflows/protocol3-verification';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parseResult = EiCommandSchema.safeParse(body);
  if (!parseResult.success) {
    return Response.json(
      { error: 'Invalid command', details: parseResult.error.flatten() },
      { status: 400 }
    );
  }

  const authResult = await withEiSession(req);
  if (!authResult.authorized) {
    return authResult.response;
  }
  const studentId = authResult.studentId;

  const command = parseResult.data;
  const commandWithStudent = { ...command, studentId };

  const db = eiStore.db;
  const queryEvents = new PostgresQueryEventsAdapter(db);
  const router = new ProtocolRouter(queryEvents);

  let protocol: 1 | 2 | 3;
  try {
    protocol = await router.decideProtocol(commandWithStudent);
  } catch (err: unknown) {
    console.error('[POST /api/ei/command] Router error:', err);
    return Response.json(
      { error: err instanceof Error ? err.message : 'Protocol routing failed' },
      { status: 500 }
    );
  }

  try {
    let result: unknown;
    if (protocol === 1) {
      const p = command.commandType === 'AppOpen' ? command.payload : null;
      if (!p) throw new Error('Protocol 1 requires AppOpen command');
      const inputData = {
        studentId,
        topic: p.topic,
        energy: p.energy,
        sleepBucket: p.sleepBucket ?? '7-8',
        pressure: p.pressure ?? 1,
        backlogPressure: p.backlogPressure ?? 1,
        openedAt: p.openedAt,
      };
      const run = await protocol1IgnitionWorkflow.createRun();
      result = await run.start({ inputData });
    } else if (protocol === 2) {
      const setAt =
        command.commandType === 'IntentSet'
          ? command.payload.setAt
          : command.commandType === 'AppOpen'
            ? new Date().toISOString()
            : null;
      if (setAt == null) throw new Error('Protocol 2 requires IntentSet or AppOpen command');
      const topic =
        command.commandType === 'IntentSet'
          ? command.payload.topic
          : command.commandType === 'AppOpen'
            ? command.payload.topic
            : '';
      const taskType = command.commandType === 'IntentSet' ? command.payload.taskType : undefined;
      const inputData = { studentId, topic, setAt, taskType };
      const run = await protocol2ActivationWorkflow.createRun();
      result = await run.start({ inputData });
    } else {
      const p = command.commandType === 'SessionEnd' ? command.payload : null;
      if (!p) throw new Error('Protocol 3 requires SessionEnd command');
      const inputData = {
        studentId,
        topic: p.topic,
        endedAt: p.endedAt,
      };
      const run = await protocol3VerificationWorkflow.createRun();
      result = await run.start({ inputData });
    }
    return Response.json(result);
  } catch (err: unknown) {
    console.error('[POST /api/ei/command] Workflow error:', err);
    return Response.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    );
  }
}
