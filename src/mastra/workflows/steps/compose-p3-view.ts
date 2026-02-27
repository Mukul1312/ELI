/**
 * Compose P3 view step — Mastra step wrapping EI ViewComposer for the verification-choice screen.
 *
 * ComposeP3View renders the Verify Now / Schedule / Skip choice UI. It only needs domain output;
 * aggregates and eventCounts are used by composePhase3View (done screen), not this step.
 *
 * @see src/ei/sdui/view-composer.ts — composeP3View (verification-choice), composePhase3View (done)
 */

import { createStep } from '@mastra/core/workflows';
import { z } from 'zod';

import { VerificationDecisionIssuedSchema } from '../../../ei/schemas/outputs';
import { P3WrappedResponseSchema } from '../../../ei/sdui/types/sdui-contract';
import { composeP3View } from '../../../ei/sdui/view-composer';

export const ComposeP3ViewInputSchema = VerificationDecisionIssuedSchema;

export const composeP3ViewStep = createStep({
  id: 'compose-p3-view',
  inputSchema: ComposeP3ViewInputSchema,
  outputSchema: P3WrappedResponseSchema,
  execute: async ({ inputData }): Promise<z.infer<typeof P3WrappedResponseSchema>> => {
    const sdui = composeP3View(inputData);

    return {
      ...inputData,
      schemaVersion: sdui.schemaVersion,
      phase: sdui.phase,
      view: sdui.view,
      actions: sdui.actions,
    };
  },
});
