/**
 * Compose P2 view step — Mastra step wrapping EI ViewComposer for P2.
 *
 * Lives in src/mastra/workflows/steps/ so EI has no dependency on Mastra.
 * Receives domain output + topic, returns wrapped response
 * { ...domainOutput, schemaVersion, phase, view, actions }.
 *
 * @see src/ei/sdui/view-composer.ts — composeP2View
 */

import { createStep } from '@mastra/core/workflows';
import { z } from 'zod';

import { ActivationPlanIssuedSchema } from '../../../ei/schemas/outputs';
import { P2WrappedResponseSchema } from '../../../ei/sdui/types/sdui-contract';
import { composeP2View } from '../../../ei/sdui/view-composer';

export const ComposeP2ViewInputSchema = z.object({
  domainOutput: ActivationPlanIssuedSchema,
  topic: z.string(),
  taskType: z.string().optional(),
  difficultyTier: z.string().optional(),
  replanCount: z.number().int().min(0).optional(),
});

export const composeP2ViewStep = createStep({
  id: 'compose-p2-view',
  inputSchema: ComposeP2ViewInputSchema,
  outputSchema: P2WrappedResponseSchema,
  execute: async ({ inputData }): Promise<z.infer<typeof P2WrappedResponseSchema>> => {
    const { domainOutput, topic, taskType, difficultyTier, replanCount = 0 } = inputData;

    const sdui = composeP2View(domainOutput, topic, replanCount, taskType, difficultyTier);

    return {
      ...domainOutput,
      schemaVersion: sdui.schemaVersion,
      phase: sdui.phase,
      view: sdui.view,
      actions: sdui.actions,
    };
  },
});
