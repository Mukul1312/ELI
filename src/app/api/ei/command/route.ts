/**
 * POST /api/ei/command
 *
 * Command-based EI entry point. Client sends a command; runtime invokes the
 * corresponding Mastra workflow and returns SDUI response.
 *
 * Body: { commandType: 'AppOpen' | 'IntentSet' | 'SessionEnd' | 'SessionStart' | 'Replan' | 'VerificationComplete' | 'RetrievalSchedule' | 'RetrievalSkip', payload: {...} }
 * Auth: Neon Auth session (required)
 */

import { eiStore } from '@/ei/runtime/db';
import { PostgresQueryEventsAdapter } from '@/ei/infrastructure/persistence/query-events.pg';
import { ProtocolRouter, EiCommandSchema } from '@/ei/application/ei-protocol-router';
import { withEiSession } from '@/app/api/ei/with-session';
import { eiAppOpenWorkflow } from '@/mastra/workflows/ei-app-open';
import { protocol2ActivationWorkflow } from '@/mastra/workflows/protocol2-activation';
import { protocol3VerificationWorkflow } from '@/mastra/workflows/protocol3-verification';
import { sessionStartWorkflow } from '@/mastra/workflows/session-start';
import { replanWorkflow } from '@/mastra/workflows/replan';
import { verificationCompleteWorkflow } from '@/mastra/workflows/verification-complete';
import { retrievalScheduleWorkflow } from '@/mastra/workflows/retrieval-schedule';
import { retrievalSkipWorkflow } from '@/mastra/workflows/retrieval-skip';

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

  try {
    let result: unknown;

    if (command.commandType === 'AppOpen') {
      const run = await eiAppOpenWorkflow.createRun();
      result = await run.start({
        inputData: {
          command: { commandType: 'AppOpen', payload: command.payload },
          studentId,
        },
      });
      return Response.json(result);
    }

    if (command.commandType === 'SessionStart') {
      const { topic, mode } = command.payload;
      const run = await sessionStartWorkflow.createRun();
      result = await run.start({
        inputData: { studentId, topic, mode },
      });
      return Response.json(result);
    }

    if (command.commandType === 'Replan') {
      const { topic, mode, reason } = command.payload;
      const run = await replanWorkflow.createRun();
      result = await run.start({
        inputData: { studentId, topic, mode, reason },
      });
      return Response.json(result);
    }

    if (command.commandType === 'VerificationComplete') {
      const { topic, mode, questionsAttempted, correct, completedAt } = command.payload;
      const run = await verificationCompleteWorkflow.createRun();
      result = await run.start({
        inputData: { studentId, topic, mode, questionsAttempted, correct, completedAt },
      });
      return Response.json(result);
    }

    if (command.commandType === 'RetrievalSchedule') {
      const { topic, mode, dueInHours, minQuestions } = command.payload;
      const run = await retrievalScheduleWorkflow.createRun();
      result = await run.start({
        inputData: { studentId, topic, mode, dueInHours, minQuestions },
      });
      return Response.json(result);
    }

    if (command.commandType === 'RetrievalSkip') {
      const { topic, mode, reason } = command.payload;
      const run = await retrievalSkipWorkflow.createRun();
      result = await run.start({
        inputData: { studentId, topic, mode, reason },
      });
      return Response.json(result);
    }

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

    if (protocol === 2) {
      if (command.commandType !== 'IntentSet') throw new Error('Protocol 2 requires IntentSet command');
      const { setAt, topic, taskType } = command.payload;
      if (!setAt || !topic) throw new Error('IntentSet requires setAt and topic');
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
