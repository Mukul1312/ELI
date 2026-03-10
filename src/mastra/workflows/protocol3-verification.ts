/**
 * Protocol 3: Verification Workflow (structured documentation)
 *
 * Orchestration delegates to RunP3GateHandler (same as POST /api/ei/protocol3).
 *
 * Learn sessions (taskType === 'reading') skip 3A entirely: the gate auto-emits
 * RetrievalScheduled and the compose step returns a direct 3B learn_close view.
 *
 * @see EI_Protocol_3_Verification.md
 * @see EI_Engine_Taxonomy.md sections 3.3, 4
 */

import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';

import { eiStore } from '../../ei/runtime/db';
import { PostgresGetStudentSignalsAdapter } from '../../ei/infrastructure/persistence/get-student-signals.pg';
import { PostgresAppendEventAdapter, withIdempotencyKey } from '../../ei/infrastructure/persistence/append-event.pg';
import { PostgresQueryEventsAdapter } from '../../ei/infrastructure/persistence/query-events.pg';
import { StudySessionRepositoryPg } from '../../ei/infrastructure/persistence/study-session-repository.pg';
import { AssessLoopHealthHandler } from '../../ei/application/assess-loop-health/handler';
import { RunP3GateHandler } from '../../ei/application/run-p3-gate/handler';
import { ProtocolEngine } from '../../ei/domain/study-session/protocol-engine';
import { VerificationDecisionIssuedSchema } from '../../ei/schemas/outputs';
import { P3WrappedResponseSchema } from '../../ei/sdui/types/sdui-contract';
import { validateEventPayload } from '../../ei/schemas/validate-event-payload';
import { composeP3ViewStep } from './steps/compose-p3-view';
import { recomputeTopicLoop } from '../../ei/infrastructure/projector/topic-loop-projector';
import { recomputeStudentAggregates } from '../../ei/infrastructure/projector/student-aggregates-projector';
import * as Q from '../../ei/db/queries';

// ============================================================================
// Schemas
// ============================================================================

const P3Input = z.object({
  studentId: z.string(),
  topic: z.string(),
  topicName: z.string().optional(),
  taskType: z.string().optional(),
  endedAt: z.string().datetime(),
  idempotencyKey: z.string().optional(),
  correlationId: z.string().optional(),
});

// ============================================================================
// Steps
// ============================================================================

const runP3Gate = createStep({
  id: 'run-p3-gate',
  inputSchema: P3Input,
  outputSchema: VerificationDecisionIssuedSchema,
  execute: async ({ inputData }): Promise<z.infer<typeof VerificationDecisionIssuedSchema>> => {
    const { studentId, topic, topicName, taskType, endedAt, idempotencyKey } = inputData;
    const db = eiStore.db;
    const signalsPort = new PostgresGetStudentSignalsAdapter(db);
    const baseAdapter = new PostgresAppendEventAdapter(db);
    // Wrap adapter so every append derives a per-event key: "${commandKey}:${eventType}".
    const appendEvent = idempotencyKey ? withIdempotencyKey(baseAdapter, idempotencyKey) : baseAdapter;
    const queryEvents = new PostgresQueryEventsAdapter(db);
    const sessionRepo = new StudySessionRepositoryPg(db);
    const assessLoopHealth = new AssessLoopHealthHandler(signalsPort, { now: () => new Date() });
    const protocolEngine = new ProtocolEngine();

    // Resolve stable session identity via repository (Option A: server owns sessionId).
    const session = await sessionRepo.getOrCreateActiveSession(studentId, topic);

    const handler = new RunP3GateHandler(
      signalsPort,
      assessLoopHealth,
      appendEvent,
      queryEvents,
      protocolEngine,
      sessionRepo,
    );
    const result = await handler.execute({
      studentId,
      topicId: topic,
      topicName,
      taskType,
      sessionId: session.sessionId,
      endedAt,
    });

    // Sync-on-append: update projections after SessionEnd + VerificationDecisionIssued
    // are written to the Ledger. This ensures pending_checks is accurate when
    // verification-complete workflow reads pre-event aggregates.
    await Promise.all([
      recomputeTopicLoop(db, studentId, topic),
      recomputeStudentAggregates(db, studentId),
    ]);

    // Learn sessions auto-create a revisit (no 3A ask needed).
    // Append RetrievalScheduled so the loop opens and counter goes UP.
    if (taskType === 'reading') {
      const now = new Date();
      const dueAt = new Date(now.getTime() + 48 * 60 * 60 * 1000);
      const payload = validateEventPayload('RetrievalScheduled', {
        studentId,
        topic,
        ...(topicName && { topicName }),
        dueAt: dueAt.toISOString(),
        questionsPlanned: 1,
        tier: 'med',
        format: 'standard',
        scheduledAt: now.toISOString(),
      });
      await appendEvent.append({
        studentId,
        eventType: 'RetrievalScheduled',
        topicId: topic,
        payload,
        idempotencyKey: idempotencyKey ? `${idempotencyKey}:RetrievalScheduled` : undefined,
      });
      // Re-sync projections after the new RetrievalScheduled event
      await Promise.all([
        recomputeTopicLoop(db, studentId, topic),
        recomputeStudentAggregates(db, studentId),
      ]);
    }

    // Dropout Signal: query consecutive deferrals after projector sync
    const consecutiveDeferrals = await Q.getConsecutiveDeferrals(db, studentId, topic);

    return { ...result, topicName, taskType, dropoutSignalActive: consecutiveDeferrals >= 3 };
  },
});

// ============================================================================
// Workflow
// ============================================================================

export const protocol3VerificationWorkflow = createWorkflow({
  id: 'ei-protocol3-verification',
  inputSchema: P3Input,
  outputSchema: P3WrappedResponseSchema,
})
  .then(runP3Gate)
  .then(composeP3ViewStep)
  .commit();
