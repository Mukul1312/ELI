/**
 * Compose P3 view step — Mastra step wrapping EI ViewComposer for P3.
 *
 * Lives in src/mastra/workflows/steps/ so EI has no dependency on Mastra.
 * Receives domain output, returns wrapped response
 * { ...domainOutput, schemaVersion, phase, view, actions }.
 *
 * @see src/ei/sdui/view-composer.ts — composeP3View
 */

import { createStep } from '@mastra/core/workflows';
import { z } from 'zod';

import { VerificationDecisionIssuedSchema } from '../../../ei/schemas/outputs';
import { P3WrappedResponseSchema } from '../../../ei/sdui/types/sdui-contract';
import { composeP3View } from '../../../ei/sdui/view-composer';

export const ComposeP3ViewInputSchema = z.object({
  domainOutput: VerificationDecisionIssuedSchema,
});

export const composeP3ViewStep = createStep({
  id: 'compose-p3-view',
  inputSchema: ComposeP3ViewInputSchema,
  outputSchema: P3WrappedResponseSchema,
  execute: async ({ inputData }): Promise<z.infer<typeof P3WrappedResponseSchema>> => {
    const { domainOutput } = inputData;

    const sdui = composeP3View(domainOutput);

    return {
      ...domainOutput,
      schemaVersion: sdui.schemaVersion,
      phase: sdui.phase,
      view: sdui.view,
      actions: sdui.actions,
    };
  },
});
