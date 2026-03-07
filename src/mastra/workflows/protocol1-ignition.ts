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

import { eiStore } from '../../ei/runtime/db';
import * as Q from '../../ei/db/queries';
import { PostgresGetStudentSignalsAdapter } from '../../ei/infrastructure/persistence/get-student-signals.pg';
import { PostgresAppendEventAdapter, withIdempotencyKey } from '../../ei/infrastructure/persistence/append-event.pg';
import { StudySessionRepositoryPg } from '../../ei/infrastructure/persistence/study-session-repository.pg';
import { AssessLoopHealthHandler } from '../../ei/application/assess-loop-health/handler';
import { RunP1GateHandler } from '../../ei/application/run-p1-gate/handler';
import { ProtocolEngine } from '../../ei/domain/study-session/protocol-engine';
import { NegotiatedIntentIssuedSchema } from '../../ei/schemas/outputs';
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
  pressure: z.number().min(1).max(5),
  backlogPressure: z.number().min(1).max(5),
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
  outputSchema: NegotiatedIntentIssuedSchema,
  execute: async ({ inputData }): Promise<z.infer<typeof NegotiatedIntentIssuedSchema>> => {
    const { studentId, topic, topicName, energy, sleepBucket, pressure, backlogPressure, idempotencyKey } = inputData;
    const db = eiStore.db;
    const baseAdapter = new PostgresAppendEventAdapter(db);
    // Wrap adapter so every append derives a per-event key: "${commandKey}:${eventType}".
    // This deduplicates both the AppOpen event and the NegotiatedIntentIssued event on retry.
    const appendEvent = idempotencyKey ? withIdempotencyKey(baseAdapter, idempotencyKey) : baseAdapter;
    const signalsPort = new PostgresGetStudentSignalsAdapter(db);
    const sessionRepo = new StudySessionRepositoryPg(db);
    const assessLoopHealth = new AssessLoopHealthHandler(signalsPort, { now: () => new Date() });
    const protocolEngine = new ProtocolEngine();

    // Resolve stable session identity via repository (Option A: server owns sessionId).
    const session = await sessionRepo.getOrCreateActiveSession(studentId, topic);

    await appendEvent.append({
      studentId,
      eventType: 'AppOpen',
      topicId: topic,
      payload: {
        energy,
        sleepBucket,
        pressure,
        backlogPressure,
        openedAt: new Date().toISOString(),
        ...(topicName && { topicName }),
      },
    });

    const handler = new RunP1GateHandler(signalsPort, assessLoopHealth, appendEvent, protocolEngine, sessionRepo);
    const result = await handler.execute({
      studentId,
      topicId: topic,
      sessionId: session.sessionId,
      energy,
      sleepBucket,
      pressure,
      backlogPressure,
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
    const db = eiStore.db;

    const [aggregates, topicStates, eventCounts, lastIdentityShownAt, historicalIndicators] =
      await Promise.all([
        Q.getAggregates(db, workflowInput.studentId),
        Q.getAllTopicStates(db, workflowInput.studentId),
        Q.countStudentEventsLast7d(db, workflowInput.studentId),
        Q.getLastIdentityShownAt(db, workflowInput.studentId),
        Q.getHistoricalIdentityIndicators(db, workflowInput.studentId),
      ]);

    return {
      domainOutput: inputData,
      workflowInput: {
        energy: workflowInput.energy,
        pressure: workflowInput.pressure,
      },
      aggregates: aggregates ?? null,
      topicStates: topicStates,
      sessionsLast7d: eventCounts.sessionsLast7d,
      loopsClosedLast7d: eventCounts.loopsClosedLast7d,
      lastIdentityShownAt: lastIdentityShownAt,
      historicalIndicators,
    };
  })
  .then(composeP1ViewStep)
  .commit();
