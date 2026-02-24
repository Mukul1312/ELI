/**
 * RetrievalSkip workflow — append RetrievalSkipped, return done SDUI.
 */

import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';

import { eiStore } from '../../ei/runtime/db';
import { PostgresAppendEventAdapter } from '../../ei/infrastructure/persistence/append-event.pg';
import { validateEventPayload } from '../../ei/schemas/validate-event-payload';
import { composeDoneView } from '../../ei/sdui/view-composer';

const RetrievalSkipInput = z.object({
  studentId: z.string(),
  topic: z.string(),
  mode: z.enum(['Rescue', 'Neutral', 'Boost']).optional(),
  reason: z.string(),
  idempotencyKey: z.string().optional(),
});

const appendAndComposeStep = createStep({
  id: 'append-retrieval-skipped-compose-done',
  inputSchema: RetrievalSkipInput,
  outputSchema: z.any(),
  execute: async ({ inputData }) => {
    const { studentId, topic, mode = 'Neutral', reason, idempotencyKey } = inputData;
    const skippedAt = new Date().toISOString();

    const payload = validateEventPayload('RetrievalSkipped', {
      studentId,
      topic,
      reason,
      skippedAt,
    });

    const appendEvent = new PostgresAppendEventAdapter(eiStore.db);
    await appendEvent.append({
      studentId,
      eventType: 'RetrievalSkipped',
      topicId: topic,
      payload,
      idempotencyKey: idempotencyKey ? `${idempotencyKey}:RetrievalSkipped` : undefined,
    });

    const sdui = composeDoneView({ topic, mode });

    return sdui;
  },
});

export const retrievalSkipWorkflow = createWorkflow({
  id: 'ei-retrieval-skip',
  inputSchema: RetrievalSkipInput,
  outputSchema: z.any(),
})
  .then(appendAndComposeStep)
  .commit();
