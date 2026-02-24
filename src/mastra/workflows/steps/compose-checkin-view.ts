/**
 * Compose checkin view step — Mastra step for first-touch AppOpen.
 *
 * Builds minimal PresentationContext and returns SduiResponse (checkin view).
 * No P1 gate; used when client sends AppOpen with initial: true.
 *
 * @see src/ei/sdui/view-composer.ts — composeCheckinView pure function
 */

import { createStep } from '@mastra/core/workflows';
import { z } from 'zod';

import { SduiResponseSchema } from '../../../ei/sdui/types/sdui-contract';
import { buildCheckinPresentationContext } from '../../../ei/sdui/presentation-context';
import { composeCheckinView } from '../../../ei/sdui/view-composer';

const CheckinViewInputSchema = z.object({
  studentId: z.string(),
  isFirstOfDay: z.boolean(),
});

export const composeCheckinViewStep = createStep({
  id: 'compose-checkin-view',
  inputSchema: CheckinViewInputSchema,
  outputSchema: SduiResponseSchema,
  execute: async ({ inputData }): Promise<z.infer<typeof SduiResponseSchema>> => {
    const { studentId, isFirstOfDay } = inputData;
    const ctx = buildCheckinPresentationContext(isFirstOfDay, studentId);
    return composeCheckinView(ctx);
  },
});
