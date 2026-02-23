/**
 * Protocol 3: Verification Workflow (structured documentation)
 *
 * Orchestration delegates to RunP3GateHandler (same as POST /api/ei/protocol3).
 *
 * @see EI_Protocol_3_Verification.md
 * @see EI_Engine_Taxonomy.md sections 3.3, 4
 */

import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';

import { eiStore } from '../../ei/runtime/db';
import { PostgresGetStudentSignalsAdapter } from '../../ei/infrastructure/persistence/get-student-signals.pg';
import { PostgresAppendEventAdapter } from '../../ei/infrastructure/persistence/append-event.pg';
import { PostgresQueryEventsAdapter } from '../../ei/infrastructure/persistence/query-events.pg';
import { AssessLoopHealthHandler } from '../../ei/application/assess-loop-health/handler';
import { RunP3GateHandler } from '../../ei/application/run-p3-gate/handler';
import { ProtocolEngine } from '../../ei/domain/study-session/protocol-engine';
import { VerificationDecisionIssuedSchema } from '../../ei/schemas/outputs';

// ============================================================================
// Schemas
// ============================================================================

const P3Input = z.object({
  studentId: z.string(),
  topic: z.string(),
  endedAt: z.string().datetime(),
});

// ============================================================================
// Steps
// ============================================================================

const runP3Gate = createStep({
  id: 'run-p3-gate',
  inputSchema: P3Input,
  outputSchema: VerificationDecisionIssuedSchema,
  execute: async ({ inputData }): Promise<z.infer<typeof VerificationDecisionIssuedSchema>> => {
    const { studentId, topic, endedAt } = inputData;
    const db = eiStore.db;
    const signalsPort = new PostgresGetStudentSignalsAdapter(db);
    const appendEvent = new PostgresAppendEventAdapter(db);
    const queryEvents = new PostgresQueryEventsAdapter(db);
    const assessLoopHealth = new AssessLoopHealthHandler(signalsPort, { now: () => new Date() });
    const protocolEngine = new ProtocolEngine();

    const handler = new RunP3GateHandler(
      signalsPort,
      assessLoopHealth,
      appendEvent,
      queryEvents,
      protocolEngine
    );
    return handler.execute({
      studentId,
      topicId: topic,
      sessionId: crypto.randomUUID(),
      endedAt,
    });
  },
});

// ============================================================================
// Workflow
// ============================================================================

export const protocol3VerificationWorkflow = createWorkflow({
  id: 'ei-protocol3-verification',
  inputSchema: P3Input,
  outputSchema: VerificationDecisionIssuedSchema,
})
  .then(runP3Gate)
  .commit();
