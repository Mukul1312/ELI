/**
 * Mastra workflow step: compose P1 SDUI view.
 *
 * Receives the NegotiatedIntentIssued domain output (from runP1Gate)
 * merged with original workflow input (energy, pressure) via .map().
 * Returns an SduiResponse — the final workflow output.
 *
 * Pure presenter — zero DB calls, zero side effects.
 *
 * @see src/ei/sdui/view-composer.ts — composeP1View pure function
 * @see docs/strategic-design/canvas-ei-runtime.md — Gateway context
 */

import { createStep } from '@mastra/core/workflows';
import { z } from 'zod';

import { NegotiatedIntentIssuedSchema } from '../../../ei/schemas/outputs';
import { SduiResponseSchema } from '../../../ei/sdui/types/sdui-contract';
import { buildP1PresentationContext } from '../../../ei/sdui/presentation-context';
import { composeP1View } from '../../../ei/sdui/view-composer';

// ============================================================================
// Input schema: domain output + workflow input fields needed for presentation
// ============================================================================

export const ComposeP1ViewInputSchema = z.object({
  domainOutput: NegotiatedIntentIssuedSchema,
  workflowInput: z.object({
    energy: z.number(),
    pressure: z.number(),
  }),
});

// ============================================================================
// Step definition
// ============================================================================

export const composeP1ViewStep = createStep({
  id: 'compose-p1-view',
  inputSchema: ComposeP1ViewInputSchema,
  outputSchema: SduiResponseSchema,
  execute: async ({ inputData }) => {
    const { domainOutput, workflowInput } = inputData;

    const ctx = buildP1PresentationContext(domainOutput, workflowInput);

    return composeP1View(domainOutput, ctx);
  },
});
