/**
 * EiCommand schemas — Zod validation for command payloads.
 * Aligns with event catalog in docs/engineering-ddd-design/05-cross-cutting-concerns.md.
 *
 * AppOpen supports two shapes: first-touch (initial: true) for checkin view,
 * and full payload (topic, energy) for checkin submit → P1/P2.
 */

import { z } from 'zod';

/** First-touch: client requests checkin view before filling form. No topic/energy. */
export const AppOpenFirstTouchSchema = z
  .object({
    initial: z.literal(true),
    isFirstOfDay: z.boolean().optional(),
  })
  .strict();

/** Onboarding submit: first-ever, topic + taskType only (no energy). */
export const AppOpenOnboardingPayloadSchema = z
  .object({
    topic: z.string(),
    topicId: z.string().optional(),
    topicName: z.string().optional(),
    taskType: z.string(),
    subject: z.string().optional(),
  })
  .strict();

/** Micro-start: V3 HIGH_PRESSURE "make it smaller" sub-state. */
export const AppOpenMicroPayloadSchema = z
  .object({
    topic: z.string(),
    topicId: z.string().optional(),
    topicName: z.string().optional(),
    energy: z.number().min(1).max(5),
    sleepBucket: z.enum(['<6', '6-7', '7-8', '>=8']).optional(),
    pressure: z.number().min(1).max(5).optional(),
    backlogPressure: z.number().min(1).max(5).optional(),
    timeboxMin: z.literal(1),
    openedAt: z.string().datetime().optional(),
  })
  .strict();

/** Checkin-submitted: client sends topic, energy, etc. to run P1. */
export const AppOpenFullPayloadSchema = z
  .object({
    topic: z.string(),
    topicId: z.string().optional(),
    topicName: z.string().optional(),
    energy: z.number().min(1).max(5),
    sleepBucket: z.enum(['<6', '6-7', '7-8', '>=8']).optional(),
    pressure: z.number().min(1).max(5).optional(),
    backlogPressure: z.number().min(1).max(5).optional(),
    openedAt: z.string().datetime().optional(),
  })
  .strict();

export const AppOpenPayloadSchema = z.union([
  AppOpenFirstTouchSchema,
  AppOpenOnboardingPayloadSchema,
  AppOpenMicroPayloadSchema,
  AppOpenFullPayloadSchema,
]);

export const IntentSetPayloadSchema = z
  .object({
    topic: z.string(),
    taskType: z.string().optional(),
    setAt: z.string().datetime(),
  })
  .strict();

export const SessionEndPayloadSchema = z
  .object({
    topic: z.string(),
    endedAt: z.string().datetime(),
    effortSummary: z.record(z.unknown()).optional(),
  })
  .strict();

export const SessionStartPayloadSchema = z
  .object({
    topic: z.string(),
    mode: z.enum(['Rescue', 'Neutral', 'Boost']).optional(),
    taskType: z.string().optional(),
    difficultyTier: z.string().optional(),
  })
  .strict();

export const ReplanPayloadSchema = z
  .object({
    topic: z.string(),
    mode: z.enum(['Rescue', 'Neutral', 'Boost']).optional(),
    reason: z.string().optional(),
  })
  .strict();

export const VerificationCompletePayloadSchema = z
  .object({
    topic: z.string(),
    mode: z.enum(['Rescue', 'Neutral', 'Boost']).optional(),
    result: z.enum(['confident', 'partial', 'needs_review']),
    completedAt: z.string().datetime(),
  })
  .strict();

export const RetrievalSchedulePayloadSchema = z
  .object({
    topic: z.string(),
    mode: z.enum(['Rescue', 'Neutral', 'Boost']).optional(),
    dueInHours: z.number(),
    minQuestions: z.number().int(),
  })
  .strict();

export const RetrievalSkipPayloadSchema = z
  .object({
    topic: z.string(),
    mode: z.enum(['Rescue', 'Neutral', 'Boost']).optional(),
    reason: z.string(),
  })
  .strict();

export const IntentResponsePayloadSchema = z
  .object({
    negotiatedIntentId: z.string(),
    decision: z.enum(['accepted', 'rejected', 'edited', 'ignored']),
    respondedAt: z.string().datetime(),
    topic: z.string().optional(),
    taskType: z.string().optional(),
    difficultyTier: z.union([z.number(), z.string()]).optional(),
    setAt: z.string().datetime().optional(),
  })
  .strict();

/** Allowed envelope keys: commandType, payload, idempotencyKey. Strict rejects any other key. */
const idempotencyEnvelope = { idempotencyKey: z.string().optional() };

export const EiCommandSchema = z.discriminatedUnion('commandType', [
  z
    .object({
      commandType: z.literal('AppOpen'),
      payload: AppOpenPayloadSchema,
      ...idempotencyEnvelope,
    })
    .strict(),
  z
    .object({
      commandType: z.literal('IntentSet'),
      payload: IntentSetPayloadSchema,
      ...idempotencyEnvelope,
    })
    .strict(),
  z
    .object({
      commandType: z.literal('SessionEnd'),
      payload: SessionEndPayloadSchema,
      ...idempotencyEnvelope,
    })
    .strict(),
  z
    .object({
      commandType: z.literal('SessionStart'),
      payload: SessionStartPayloadSchema,
      ...idempotencyEnvelope,
    })
    .strict(),
  z
    .object({
      commandType: z.literal('Replan'),
      payload: ReplanPayloadSchema,
      ...idempotencyEnvelope,
    })
    .strict(),
  z
    .object({
      commandType: z.literal('VerificationComplete'),
      payload: VerificationCompletePayloadSchema,
      ...idempotencyEnvelope,
    })
    .strict(),
  z
    .object({
      commandType: z.literal('RetrievalSchedule'),
      payload: RetrievalSchedulePayloadSchema,
      ...idempotencyEnvelope,
    })
    .strict(),
  z
    .object({
      commandType: z.literal('RetrievalSkip'),
      payload: RetrievalSkipPayloadSchema,
      ...idempotencyEnvelope,
    })
    .strict(),
  z
    .object({
      commandType: z.literal('IntentResponse'),
      payload: IntentResponsePayloadSchema,
      ...idempotencyEnvelope,
    })
    .strict(),
]);

/** Command envelope: EiCommand + optional idempotencyKey for retry safety. Strict schema rejects unknown keys. */
export const EiCommandEnvelopeSchema = EiCommandSchema;
export type EiCommandEnvelope = z.infer<typeof EiCommandEnvelopeSchema>;

export type AppOpenPayload = z.infer<typeof AppOpenPayloadSchema>;
export type AppOpenFirstTouchPayload = z.infer<typeof AppOpenFirstTouchSchema>;
export type AppOpenOnboardingPayload = z.infer<typeof AppOpenOnboardingPayloadSchema>;
export type AppOpenMicroPayload = z.infer<typeof AppOpenMicroPayloadSchema>;
export type AppOpenFullPayload = z.infer<typeof AppOpenFullPayloadSchema>;

/** Type guard: true when payload is first-touch (checkin view request). */
export function isAppOpenFirstTouch(
  payload: AppOpenPayload
): payload is AppOpenFirstTouchPayload {
  return 'initial' in payload && payload.initial === true;
}

/** Type guard: true when payload is onboarding submit (topic + taskType, first-ever). */
export function isAppOpenOnboarding(
  payload: AppOpenPayload
): payload is AppOpenOnboardingPayload {
  return 'taskType' in payload && typeof payload.taskType === 'string' && !('energy' in payload);
}

/** Type guard: true when payload is micro-start (timeboxMin: 1). */
export function isAppOpenMicro(
  payload: AppOpenPayload
): payload is AppOpenMicroPayload {
  return 'timeboxMin' in payload && payload.timeboxMin === 1;
}
export type IntentSetPayload = z.infer<typeof IntentSetPayloadSchema>;
export type SessionEndPayload = z.infer<typeof SessionEndPayloadSchema>;
export type SessionStartPayload = z.infer<typeof SessionStartPayloadSchema>;
export type ReplanPayload = z.infer<typeof ReplanPayloadSchema>;
export type VerificationCompletePayload = z.infer<typeof VerificationCompletePayloadSchema>;
export type RetrievalSchedulePayload = z.infer<typeof RetrievalSchedulePayloadSchema>;
export type RetrievalSkipPayload = z.infer<typeof RetrievalSkipPayloadSchema>;
export type IntentResponsePayload = z.infer<typeof IntentResponsePayloadSchema>;
export type EiCommand = z.infer<typeof EiCommandSchema>;
