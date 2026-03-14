/**
 * Compose P2 view step — Mastra step wrapping EI ViewComposer for P2.
 *
 * Single-screen Phase 2: appends FirstActionStarted event, then composes
 * session view with first-action instruction text visible throughout.
 *
 * @see src/ei/sdui/view-composer.ts — composeP2View → composeSessionView
 */

import { createStep } from '@mastra/core/workflows';
import { z } from 'zod';

import { getDb } from '../../../ei/runtime/db';
import { PostgresAppendEventAdapter } from '../../../ei/infrastructure/persistence/append-event.pg';
import { validateEventPayload } from '../../../ei/schemas/validate-event-payload';
import { ActivationPlanIssuedSchema } from '../../../ei/schemas/outputs';
import { P2WrappedResponseSchema } from '../../../ei/study-session-orchestration/types/sdui-contract';
import { composeP2View } from '../../../ei/study-session-orchestration/domain/services/view-composer';

export const ComposeP2ViewInputSchema = z.object({
  domainOutput: ActivationPlanIssuedSchema,
  topic: z.string(),
  topicName: z.string().optional(),
  taskType: z.string().optional(),
  timebox: z.number().optional(),
  replanCount: z.number().int().min(0).optional(),
  studentId: z.string(),
  idempotencyKey: z.string().optional(),
  correlationId: z.string().optional(),
});

export const composeP2ViewStep = createStep({
  id: 'compose-p2-view',
  inputSchema: ComposeP2ViewInputSchema,
  outputSchema: P2WrappedResponseSchema,
  execute: async ({ inputData }): Promise<z.infer<typeof P2WrappedResponseSchema>> => {
    const { domainOutput, topic, topicName, taskType, timebox, replanCount = 0, studentId, idempotencyKey, correlationId } = inputData;

    // Append FirstActionStarted event (no separate SessionStart command in single-screen P2)
    const payload = validateEventPayload('FirstActionStarted', {
      studentId,
      topic,
      ...(topicName && { topicName }),
      startedAt: new Date().toISOString(),
    });

    const appendEvent = new PostgresAppendEventAdapter(getDb());
    await appendEvent.append({
      studentId,
      eventType: 'FirstActionStarted',
      topicId: topic,
      payload,
      idempotencyKey: idempotencyKey ? `${idempotencyKey}:FirstActionStarted` : undefined,
    });

    const sdui = composeP2View(domainOutput, topic, replanCount, taskType, timebox, topicName);

    // Emit ViewComposed — PresentationTrace observability (ops-observability-tactical-spec §12).
    await appendEvent.append({
      studentId,
      eventType: 'ViewComposed',
      topicId: topic,
      payload: {
        studentId,
        correlationId,
        phase: 'p2',
        composedAt: new Date().toISOString(),
      },
    });

    return {
      ...domainOutput,
      schemaVersion: sdui.schemaVersion,
      phase: sdui.phase,
      view: sdui.view,
      actions: sdui.actions,
    };
  },
});
