/**
 * RetrievalSchedule workflow — append RetrievalScheduled, return done SDUI.
 */

import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';

import { eiStore } from '../../ei/runtime/db';
import { PostgresAppendEventAdapter } from '../../ei/infrastructure/persistence/append-event.pg';
import { validateEventPayload } from '../../ei/schemas/validate-event-payload';
import { composeDoneView } from '../../ei/sdui/view-composer';

const RetrievalScheduleInput = z.object({
  studentId: z.string(),
  topic: z.string(),
  mode: z.enum(['Rescue', 'Neutral', 'Boost']).optional(),
  dueInHours: z.number(),
  minQuestions: z.number().int(),
});

const appendAndComposeStep = createStep({
  id: 'append-retrieval-scheduled-compose-done',
  inputSchema: RetrievalScheduleInput,
  outputSchema: z.any(),
  execute: async ({ inputData }) => {
    const { studentId, topic, mode = 'Neutral', dueInHours, minQuestions } = inputData;
    const now = new Date();
    const dueAt = new Date(now.getTime() + dueInHours * 60 * 60 * 1000).toISOString();
    const scheduledAt = now.toISOString();

    const payload = validateEventPayload('RetrievalScheduled', {
      studentId,
      topic,
      dueAt,
      questionsPlanned: minQuestions,
      tier: 'med',
      format: 'standard',
      scheduledAt,
    });

    const appendEvent = new PostgresAppendEventAdapter(eiStore.db);
    await appendEvent.append({
      studentId,
      eventType: 'RetrievalScheduled',
      topicId: topic,
      payload,
    });

    const sdui = composeDoneView({ topic, mode });

    return sdui;
  },
});

export const retrievalScheduleWorkflow = createWorkflow({
  id: 'ei-retrieval-schedule',
  inputSchema: RetrievalScheduleInput,
  outputSchema: z.any(),
})
  .then(appendAndComposeStep)
  .commit();
