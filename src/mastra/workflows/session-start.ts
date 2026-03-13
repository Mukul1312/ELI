/**
 * SessionStart workflow — append FirstActionStarted, return session SDUI view.
 *
 * Invoked when user clicks "Start" on the activation card.
 */

import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';

import { getDb } from '../../ei/runtime/db';
import { PostgresAppendEventAdapter } from '../../ei/infrastructure/persistence/append-event.pg';
import { validateEventPayload } from '../../ei/schemas/validate-event-payload';
import { composeSessionView, FIRST_ACTION_BY_TASK, FIRST_ACTION_DEFAULT } from '../../ei/study-session-orchestration/domain/services/view-composer';

const SessionStartInput = z.object({
  studentId: z.string(),
  topic: z.string(),
  topicName: z.string().optional(),
  mode: z.enum(['Rescue', 'Neutral', 'Boost']).optional(),
  taskType: z.string().optional(),
  timebox: z.number().optional(),
  firstActionText: z.string().optional(),
  idempotencyKey: z.string().optional(),
  correlationId: z.string().optional(),
});

const appendAndComposeStep = createStep({
  id: 'append-first-action-compose-session',
  inputSchema: SessionStartInput,
  outputSchema: z.any(),
  execute: async ({ inputData }) => {
    const { studentId, topic, topicName, mode = 'Neutral', taskType, timebox, firstActionText, idempotencyKey } = inputData;
    const startedAt = new Date().toISOString();

    const payload = validateEventPayload('FirstActionStarted', {
      studentId,
      topic,
      ...(topicName && { topicName }),
      startedAt,
    });

    const appendEvent = new PostgresAppendEventAdapter(getDb());
    await appendEvent.append({
      studentId,
      eventType: 'FirstActionStarted',
      topicId: topic,
      payload,
      idempotencyKey: idempotencyKey ? `${idempotencyKey}:FirstActionStarted` : undefined,
    });

    const resolvedFirstAction = firstActionText
      ?? (taskType ? FIRST_ACTION_BY_TASK[taskType] : undefined)
      ?? FIRST_ACTION_DEFAULT;

    const sdui = composeSessionView({
      topic,
      topicName,
      mode,
      playId: 'P2-N1',
      taskType,
      timebox,
      firstActionText: resolvedFirstAction,
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
