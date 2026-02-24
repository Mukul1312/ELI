/**
 * Compose P1 view step — Mastra step wrapping EI ViewComposer for P1.
 *
 * Lives in src/mastra/workflows/steps/ so EI has no dependency on Mastra.
 * Receives domain output + workflow input, returns wrapped response
 * { ...domainOutput, schemaVersion, phase, view, actions } for backward compatibility.
 *
 * @see src/ei/sdui/view-composer.ts — composeP1View pure function
 * @see docs/strategic-design/canvas-ei-runtime.md — Gateway context
 */

import { createStep } from '@mastra/core/workflows';
import { z } from 'zod';

import { NegotiatedIntentIssuedSchema } from '../../../ei/schemas/outputs';
import { P1WrappedResponseSchema } from '../../../ei/sdui/types/sdui-contract';
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
  outputSchema: P1WrappedResponseSchema,
  execute: async ({ inputData }): Promise<z.infer<typeof P1WrappedResponseSchema>> => {
    const { domainOutput, workflowInput } = inputData;

    const ctx = buildP1PresentationContext(domainOutput, workflowInput);
    const sdui = composeP1View(domainOutput, ctx);

    return {
      ...domainOutput,
      schemaVersion: sdui.schemaVersion,
      phase: sdui.phase,
      view: sdui.view,
      actions: sdui.actions,
    };
  },
});
