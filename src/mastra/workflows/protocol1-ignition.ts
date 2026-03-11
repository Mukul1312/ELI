/**
 * Protocol 1: Ignition Workflow (structured documentation)
 *
 * Orchestration delegates to RunP1GateHandler (same as POST /api/ei/protocol1).
 *
 * @see EI_Protocol_1_Ignition.md
 * @see EI_Engine_Taxonomy.md sections 3.1, 4
 */

import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';

import { getDb } from '../../ei/runtime/db';
import * as Q from '../../ei/db/queries';
import { PostgresTopicDisplayNameWriter } from '../../ei/infrastructure/persistence/topic-display-name-writer.pg';
import { PostgresGetStudentSignalsAdapter } from '../../ei/infrastructure/persistence/get-student-signals.pg';
import { PostgresAppendEventAdapter, withIdempotencyKey } from '../../ei/infrastructure/persistence/append-event.pg';
import { AssessLoopHealthHandler } from '../../ei/application/assess-loop-health/handler';
import { RunP1GateHandler } from '../../ei/application/run-p1-gate/handler';
import { ProtocolEngine } from '../../ei/domain/study-session/protocol-engine';
import { SessionIntentIssuedSchema } from '../../ei/schemas/outputs';
import { P1WrappedResponseSchema } from '../../ei/sdui/types/sdui-contract';
import { composeP1ViewStep } from './steps/compose-p1-view';

// ============================================================================
// Input / output schemas
// ============================================================================

const P1Input = z.object({
  studentId: z.string(),
  topic: z.string(),
  topicName: z.string().optional(),
  energy: z.number().min(1).max(5),
  sleepBucket: z.enum(['<6', '6-7', '7-8', '>=8']),
  openedAt: z.string().datetime().optional(),
  idempotencyKey: z.string().optional(),
  correlationId: z.string().optional(),
});

// ============================================================================
// Steps
// ============================================================================

const runP1Gate = createStep({
  id: 'run-p1-gate',
  inputSchema: P1Input,
  outputSchema: SessionIntentIssuedSchema,
  execute: async ({ inputData }): Promise<z.infer<typeof SessionIntentIssuedSchema>> => {
    const { studentId, topic, topicName, energy, sleepBucket, idempotencyKey } = inputData;
    const db = getDb();
    const baseAdapter = new PostgresAppendEventAdapter(db);
    // Wrap adapter so every append derives a per-event key: "${commandKey}:${eventType}".
    // This deduplicates both the AppOpen event and the SessionIntentIssued event on retry.
    const appendEvent = idempotencyKey ? withIdempotencyKey(baseAdapter, idempotencyKey) : baseAdapter;
    const signalsPort = new PostgresGetStudentSignalsAdapter(db);
    const assessLoopHealth = new AssessLoopHealthHandler(signalsPort, { now: () => new Date() });
    const protocolEngine = new ProtocolEngine();
    const sessionId = crypto.randomUUID();

    await appendEvent.append({
      studentId,
      eventType: 'AppOpen',
      topicId: topic,
      payload: {
        energy,
        sleepBucket,
        openedAt: new Date().toISOString(),
        ...(topicName && { topicName }),
      },
    });

    // Persist display name early via driven port (AppOpen is not a TopicLoop event,
    // so sync-on-append projector won't extract it). Pending-items-list needs it immediately.
    if (topicName) {
      const displayNameWriter = new PostgresTopicDisplayNameWriter(db);
      await displayNameWriter.upsertDisplayName(studentId, topic, topicName);
    }

    const handler = new RunP1GateHandler(signalsPort, assessLoopHealth, appendEvent, protocolEngine);
    const result = await handler.execute({
      studentId,
      topicId: topic,
      sessionId,
      energy,
      sleepBucket,
    });
    return { ...result, topicName };
  },
});

// ============================================================================
// Workflow definition
// ============================================================================

export const protocol1IgnitionWorkflow = createWorkflow({
  id: 'ei-protocol1-ignition',
  inputSchema: P1Input,
  outputSchema: P1WrappedResponseSchema,
})
  .then(runP1Gate)
  .map(async ({ inputData, getInitData }) => {
    const workflowInput = getInitData() as z.infer<typeof P1Input>;
    const db = getDb();

    const [aggregates, topicStates, checkinCtx, historicalIndicators] =
      await Promise.all([
        Q.getAggregates(db, workflowInput.studentId),
        Q.getAllTopicStates(db, workflowInput.studentId),
        Q.getCheckinEventContext(db, workflowInput.studentId),
        Q.getHistoricalIdentityIndicators(db, workflowInput.studentId),
      ]);

    return {
      domainOutput: inputData,
      workflowInput: {
        energy: workflowInput.energy,
      },
      aggregates: aggregates ?? null,
      topicStates: topicStates,
      sessionsLast7d: checkinCtx.sessionsLast7d,
      loopsClosedLast7d: checkinCtx.loopsClosedLast7d,
      sessionsTotal: checkinCtx.sessionsTotal,
      hasPriorOpen: checkinCtx.hasPriorOpen,
      lastIdentityShownAt: checkinCtx.lastIdentityShownAt,
      historicalIndicators,
    };
  })
  .then(composeP1ViewStep)
  .commit();
