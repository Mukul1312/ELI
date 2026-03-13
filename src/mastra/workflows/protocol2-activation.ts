/**
 * Protocol 2: Activation Workflow (structured documentation)
 *
 * Orchestration delegates to RunP2GateHandler (same as POST /api/ei/protocol2).
 *
 * @see EI_Protocol_2_Activation.md
 * @see EI_Engine_Taxonomy.md sections 3.2, 4
 */

import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';

import { getDb } from '../../ei/runtime/db';
import * as Q from '../../ei/db/queries';
import { PostgresGetStudentSignalsAdapter } from '../../ei/infrastructure/persistence/get-student-signals.pg';
import { PostgresTopicDisplayNameWriter } from '../../ei/infrastructure/persistence/topic-display-name-writer.pg';
import { PostgresAppendEventAdapter, withIdempotencyKey } from '../../ei/infrastructure/persistence/append-event.pg';
import { PostgresQueryEventsAdapter } from '../../ei/infrastructure/persistence/query-events.pg';
import { AssessLoopHealthHandler } from '../../ei/application/assess-loop-health/handler';
import { RunP2GateHandler } from '../../ei/application/run-p2-gate/handler';
import { PostgresStudySessionRepository } from '../../ei/infrastructure/persistence/study-session-repository.pg';
import { ProtocolEngine } from '../../ei/domain/study-session/protocol-engine';
import { ActivationPlanIssuedSchema } from '../../ei/schemas/outputs';
import { P2WrappedResponseSchema } from '../../ei/sdui/types/sdui-contract';
import { composeP2ViewStep } from './steps/compose-p2-view';

// ============================================================================
// Input / output schemas
// ============================================================================

const P2Input = z.object({
  studentId: z.string(),
  topic: z.string(),
  topicName: z.string().optional(),
  taskType: z.string().optional(),
  timebox: z.number().optional(),
  setAt: z.string().datetime(),
  idempotencyKey: z.string().optional(),
  correlationId: z.string().optional(),
});

// ============================================================================
// Steps
// ============================================================================

const runP2Gate = createStep({
  id: 'run-p2-gate',
  inputSchema: P2Input,
  outputSchema: ActivationPlanIssuedSchema,
  execute: async ({ inputData }): Promise<z.infer<typeof ActivationPlanIssuedSchema>> => {
    const { studentId, topic, topicName, setAt, taskType, idempotencyKey } = inputData;
    const db = getDb();
    const signalsPort = new PostgresGetStudentSignalsAdapter(db);
    const baseAdapter = new PostgresAppendEventAdapter(db);
    // Wrap adapter so every append derives a per-event key: "${commandKey}:${eventType}".
    const appendEvent = idempotencyKey ? withIdempotencyKey(baseAdapter, idempotencyKey) : baseAdapter;
    const queryEvents = new PostgresQueryEventsAdapter(db);
    const assessLoopHealth = new AssessLoopHealthHandler(signalsPort, { now: () => new Date() });
    const protocolEngine = new ProtocolEngine();

    // ADR-004 D2: Read sessionId from projection instead of scanning ei_events.
    // Fallback uuid: micro path skips P1 (no prior SessionIntentIssued), pre-migration sessions.
    const topicState = await Q.getTopicState(db, studentId, topic);
    const sessionId = topicState?.current_session_id ?? crypto.randomUUID();

    // Persist display name early via driven port (micro path skips P1,
    // and SessionIntentIssued is not a TopicLoop event, so sync-on-append
    // projector won't extract it). Pending-items-list needs it immediately.
    if (topicName) {
      const displayNameWriter = new PostgresTopicDisplayNameWriter(db);
      await displayNameWriter.upsertDisplayName(studentId, topic, topicName);
    }

    // Persist last task type for pre-selection (formation-period feature)
    if (taskType) {
      const { upsertTopicState } = await import('../../ei/db/queries');
      await upsertTopicState(db, studentId, topic, { last_task_type: taskType });
    }

    const handler = new RunP2GateHandler(
      signalsPort,
      assessLoopHealth,
      appendEvent,
      queryEvents,
      protocolEngine,
      new PostgresStudySessionRepository(db),
    );
    return handler.execute({
      studentId,
      topicId: topic,
      sessionId,
      setAt,
      taskType,
    });
  },
});

// ============================================================================
// Workflow
// ============================================================================

export const protocol2ActivationWorkflow = createWorkflow({
  id: 'ei-protocol2-activation',
  inputSchema: P2Input,
  outputSchema: P2WrappedResponseSchema,
})
  .then(runP2Gate)
  .map(async ({ inputData, getInitData }) => {
    const initData = getInitData() as z.infer<typeof P2Input>;
    return {
      domainOutput: inputData,
      topic: initData.topic,
      topicName: initData.topicName,
      taskType: initData.taskType,
      timebox: initData.timebox,
      replanCount: 0, // TODO: pass from context when Replan workflow re-runs P2
      studentId: initData.studentId,
      idempotencyKey: initData.idempotencyKey,
    };
  })
  .then(composeP2ViewStep)
  .commit();
