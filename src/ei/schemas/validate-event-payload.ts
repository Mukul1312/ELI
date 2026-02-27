/**
 * Strict payload validation per event type.
 * Enforces cross-cutting schema strictness: unknown keys rejected.
 */

import { z } from 'zod';
import {
  AppOpenSchema,
  IntentSetSchema,
  SessionEndSchema,
  IntentResponseSchema,
  RetrievalVerifiedSchema,
  RetrievalScheduledSchema,
  RetrievalSkippedSchema,
  VerificationCompletedSchema,
  FirstActionStartedSchema,
  ReplanSchema,
  IdentityMomentShownSchema,
} from './events';
import {
  NegotiatedIntentIssuedSchema,
  ActivationPlanIssuedSchema,
  VerificationDecisionIssuedSchema,
  StrategicAdjustmentDecisionSchema,
} from './outputs';

const ScheduleMissedSchema = z
  .object({
    studentId: z.string(),
    topic: z.string(),
    missedAt: z.string().datetime(),
  })
  .strict();

const EVENT_SCHEMAS: Record<string, z.ZodTypeAny> = {
  AppOpen: AppOpenSchema.strict(),
  IntentSet: IntentSetSchema.strict(),
  SessionEnd: SessionEndSchema.strict(),
  IntentResponse: IntentResponseSchema.strict(),
  RetrievalVerified: RetrievalVerifiedSchema.strict(),
  RetrievalScheduled: RetrievalScheduledSchema.strict(),
  RetrievalSkipped: RetrievalSkippedSchema.strict(),
  VerificationCompleted: VerificationCompletedSchema.strict(),
  FirstActionStarted: FirstActionStartedSchema.strict(),
  Replan: ReplanSchema.strict(),
  NegotiatedIntentIssued: NegotiatedIntentIssuedSchema.strict(),
  ActivationPlanIssued: ActivationPlanIssuedSchema.strict(),
  VerificationDecisionIssued: VerificationDecisionIssuedSchema.strict(),
  StrategicAdjustmentDecision: StrategicAdjustmentDecisionSchema.strict(),
  ScheduleMissed: ScheduleMissedSchema,
  IdentityMomentShown: IdentityMomentShownSchema,
};

export function validateEventPayload(
  eventType: string,
  payload: Record<string, unknown>,
): Record<string, unknown> {
  const schema = EVENT_SCHEMAS[eventType];
  if (!schema) {
    return payload;
  }
  const result = schema.safeParse(payload);
  if (!result.success) {
    const first = result.error.errors[0];
    const path = first.path.join('.');
    throw new Error(
      `Invalid payload for ${eventType}: ${path ? `${path}: ` : ''}${first.message}`,
    );
  }
  return result.data as Record<string, unknown>;
}
