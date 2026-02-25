/**
 * Replan workflow — append Replan event, re-run P2, return activation SDUI.
 *
 * Invoked when user clicks "Replan" on the activation card.
 */

import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';

import { eiStore } from '../../ei/runtime/db';
import { PostgresAppendEventAdapter } from '../../ei/infrastructure/persistence/append-event.pg';
import { validateEventPayload } from '../../ei/schemas/validate-event-payload';
import { protocol2ActivationWorkflow } from './protocol2-activation';

const ReplanInput = z.object({
  studentId: z.string(),
  topic: z.string(),
  reason: z.string().optional(),
  idempotencyKey: z.string().optional(),
  correlationId: z.string().optional(),
});

const appendReplanStep = createStep({
  id: 'append-replan',
  inputSchema: ReplanInput,
  outputSchema: ReplanInput,
  execute: async ({ inputData }) => {
    const { studentId, topic, reason, idempotencyKey } = inputData;
    const replannedAt = new Date().toISOString();

    const payload = validateEventPayload('Replan', {
      studentId,
      topic,
      reason: reason ?? 'student-initiated',
      replannedAt,
    });

    const appendEvent = new PostgresAppendEventAdapter(eiStore.db);
    await appendEvent.append({
      studentId,
      eventType: 'Replan',
      topicId: topic,
      payload,
      idempotencyKey: idempotencyKey ? `${idempotencyKey}:Replan` : undefined,
    });

    return inputData;
  },
});

const runP2Step = createStep({
  id: 'run-p2-after-replan',
  inputSchema: ReplanInput,
  outputSchema: z.any(),
  execute: async ({ inputData }) => {
    const { studentId, topic, idempotencyKey, correlationId } = inputData;
    const setAt = new Date().toISOString();
    const run = await protocol2ActivationWorkflow.createRun();
    const result = await run.start({
      inputData: { studentId, topic, setAt, taskType: undefined, idempotencyKey, correlationId },
    });
    return result;
  },
});

export const replanWorkflow = createWorkflow({
  id: 'ei-replan',
  inputSchema: ReplanInput,
  outputSchema: z.any(),
})
  .then(appendReplanStep)
  .then(runP2Step)
  .commit();
