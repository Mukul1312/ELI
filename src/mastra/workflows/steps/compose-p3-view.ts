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

import { VerificationDecisionIssuedSchema } from '../../../ei/schemas/outputs';
import { P3WrappedResponseSchema } from '../../../ei/sdui/types/sdui-contract';
import { composeP3View, composeLearnCloseView } from '../../../ei/sdui/view-composer';

export const ComposeP3ViewInputSchema = VerificationDecisionIssuedSchema;

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

    return {
      ...inputData,
      schemaVersion: sdui.schemaVersion,
      phase: sdui.phase,
      view: sdui.view,
      actions: sdui.actions,
    };
  },
});
