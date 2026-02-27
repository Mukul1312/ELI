/**
 * SessionStart workflow — append FirstActionStarted, return session SDUI view.
 *
 * Invoked when user clicks "Start" on the activation card.
 */

import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';

import { eiStore } from '../../ei/runtime/db';
import { PostgresAppendEventAdapter } from '../../ei/infrastructure/persistence/append-event.pg';
import { validateEventPayload } from '../../ei/schemas/validate-event-payload';
import { composeSessionView } from '../../ei/sdui/view-composer';

const SessionStartInput = z.object({
  studentId: z.string(),
  topic: z.string(),
  mode: z.enum(['Rescue', 'Neutral', 'Boost']).optional(),
  taskType: z.string().optional(),
  difficultyTier: z.string().optional(),
  idempotencyKey: z.string().optional(),
  correlationId: z.string().optional(),
});

const appendAndComposeStep = createStep({
  id: 'append-first-action-compose-session',
  inputSchema: SessionStartInput,
  outputSchema: z.any(),
  execute: async ({ inputData }) => {
    const { studentId, topic, mode = 'Neutral', taskType, difficultyTier, idempotencyKey } = inputData;
    const startedAt = new Date().toISOString();

    const payload = validateEventPayload('FirstActionStarted', {
      studentId,
      topic,
      startedAt,
    });

    const appendEvent = new PostgresAppendEventAdapter(eiStore.db);
    await appendEvent.append({
      studentId,
      eventType: 'FirstActionStarted',
      topicId: topic,
      payload,
      idempotencyKey: idempotencyKey ? `${idempotencyKey}:FirstActionStarted` : undefined,
    });

    const sdui = composeSessionView({
      topic,
      mode,
      playId: 'P2-N1',
      taskType,
      difficultyTier,
    });

    return sdui;
  },
});

export const sessionStartWorkflow = createWorkflow({
  id: 'ei-session-start',
  inputSchema: SessionStartInput,
  outputSchema: z.any(),
})
  .then(appendAndComposeStep)
  .commit();
