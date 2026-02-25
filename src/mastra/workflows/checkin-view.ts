/**
 * Checkin view workflow — returns SduiResponse for first-touch AppOpen.
 *
 * Single step: build context + composeCheckinView. No P1 gate.
 */

import { createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';

import { SduiResponseSchema } from '../../ei/sdui/types/sdui-contract';
import { composeCheckinViewStep } from './steps/compose-checkin-view';

const CheckinViewInput = z.object({
  studentId: z.string(),
  isFirstOfDay: z.boolean(),
  correlationId: z.string().optional(),
});

export const checkinViewWorkflow = createWorkflow({
  id: 'ei-checkin-view',
  inputSchema: CheckinViewInput,
  outputSchema: SduiResponseSchema,
})
  .then(composeCheckinViewStep)
  .commit();
