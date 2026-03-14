/**
 * Compose P3 view step — Mastra step wrapping EI ViewComposer for the verification-choice screen.
 *
 * For Practice/Revise sessions: renders the 3A ask card (Does it feel solid now?).
 * For Learn sessions (taskType === 'reading'): skips 3A, renders direct 3B learn_close card.
 *
 * @see src/ei/sdui/view-composer.ts — composeP3View (3A), composeLearnCloseView (3B direct)
 */

import { createStep } from '@mastra/core/workflows';
import { z } from 'zod';

import { getDb } from '../../../ei/runtime/db';
import { PostgresAppendEventAdapter } from '../../../ei/infrastructure/persistence/append-event.pg';
import { VerificationDecisionIssuedSchema } from '../../../ei/schemas/outputs';
import { P3WrappedResponseSchema } from '../../../ei/study-session-orchestration/types/sdui-contract';
import { composeP3View, composeLearnCloseView } from '../../../ei/study-session-orchestration/domain/services/view-composer';

export const ComposeP3ViewInputSchema = VerificationDecisionIssuedSchema.extend({
  correlationId: z.string().optional(),
});

export const composeP3ViewStep = createStep({
  id: 'compose-p3-view',
  inputSchema: ComposeP3ViewInputSchema,
  outputSchema: P3WrappedResponseSchema,
  execute: async ({ inputData }): Promise<z.infer<typeof P3WrappedResponseSchema>> => {
    // Learn sessions skip 3A entirely — go direct to 3B learn_close card.
    // RetrievalScheduled was already appended by the P3 gate step.
    const isLearn = inputData.taskType === 'reading';

    const sdui = isLearn
      ? composeLearnCloseView(inputData)
      : composeP3View(inputData, inputData.sessionDurationSec, inputData.dropoutSignalActive ?? false);

    // Emit ViewComposed — PresentationTrace observability (ops-observability-tactical-spec §12).
    await new PostgresAppendEventAdapter(getDb()).append({
      studentId: inputData.studentId,
      eventType: 'ViewComposed',
      topicId: inputData.topic,
      payload: {
        studentId: inputData.studentId,
        correlationId: inputData.correlationId,
        phase: 'p3',
        composedAt: new Date().toISOString(),
      },
    });

    return {
      ...inputData,
      schemaVersion: sdui.schemaVersion,
      phase: sdui.phase,
      view: sdui.view,
      actions: sdui.actions,
    };
  },
});
