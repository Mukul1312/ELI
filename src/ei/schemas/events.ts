/**
 * Zod schemas for all EI events, organized by tier.
 *
 * Source of truth: EI_Engine_Taxonomy.md section 1.2
 */

import { z } from 'zod';

// ============================================================================
// Shared enums and primitives
// ============================================================================

export const SleepBucketEnum = z.enum(['<6', '6-7', '7-8', '>=8']);
export type SleepBucket = z.infer<typeof SleepBucketEnum>;

export const DifficultyTierEnum = z.enum(['easy', 'med', 'hard', 'advanced']);
export type DifficultyTier = z.infer<typeof DifficultyTierEnum>;

export const TaskTypeEnum = z.enum(['practice', 'reading', 'video', 'revision', 'mixed']);
export type TaskType = z.infer<typeof TaskTypeEnum>;

export const IntentDecisionEnum = z.enum(['accepted', 'edited', 'rejected', 'ignored']);
export type IntentDecision = z.infer<typeof IntentDecisionEnum>;

export const VerificationDecisionEnum = z.enum(['VerifyNow', 'ScheduleVerify', 'Skip']);
export type VerificationDecisionType = z.infer<typeof VerificationDecisionEnum>;

export const VerificationFormatEnum = z.enum(['standard', 'error_log', 'recall', 'mixed_set']);
export type VerificationFormat = z.infer<typeof VerificationFormatEnum>;

// ============================================================================
// Tier 1 -- Core gate events
// ============================================================================

export const AppOpenSchema = z.object({
  studentId: z.string(),
  energy: z.number().int().min(1).max(5),
  pressure: z.number().int().min(1).max(5).optional(),
  sleepBucket: SleepBucketEnum.optional(),
  backlogPressure: z.number().int().min(1).max(5).optional(),
  openedAt: z.string().datetime(),
});
export type AppOpen = z.infer<typeof AppOpenSchema>;

export const IntentSetSchema = z.object({
  studentId: z.string(),
  topic: z.string(),
  taskType: TaskTypeEnum.optional(),
  scope: z.object({
    timeboxMin: z.number().optional(),
    questionCount: z.number().optional(),
  }).optional(),
  difficultyTier: DifficultyTierEnum.optional(),
  setAt: z.string().datetime(),
});
export type IntentSet = z.infer<typeof IntentSetSchema>;

export const SessionEndSchema = z.object({
  studentId: z.string(),
  topic: z.string(),
  endedAt: z.string().datetime(),
});
export type SessionEnd = z.infer<typeof SessionEndSchema>;

// ============================================================================
// Tier 1 -- Protocol output events (system-emitted, see also outputs.ts)
// ============================================================================

export const IntentResponseSchema = z.object({
  studentId: z.string(),
  negotiatedIntentId: z.string(),
  decision: IntentDecisionEnum,
  respondedAt: z.string().datetime(),
  reason: z.string().optional(),
});
export type IntentResponse = z.infer<typeof IntentResponseSchema>;

// ============================================================================
// Tier 1 -- Protocol 3 sub-events (verification outcomes)
// ============================================================================

export const RetrievalVerifiedSchema = z.object({
  studentId: z.string(),
  topic: z.string(),
  questionsAttempted: z.number().int(),
  tier: DifficultyTierEnum,
  format: VerificationFormatEnum,
  verifiedAt: z.string().datetime(),
  score: z.number().optional(),
});
export type RetrievalVerified = z.infer<typeof RetrievalVerifiedSchema>;

export const RetrievalScheduledSchema = z.object({
  studentId: z.string(),
  topic: z.string(),
  dueAt: z.string().datetime(),
  questionsPlanned: z.number().int(),
  tier: DifficultyTierEnum,
  format: VerificationFormatEnum,
  scheduledAt: z.string().datetime(),
});
export type RetrievalScheduled = z.infer<typeof RetrievalScheduledSchema>;

export const RetrievalSkippedSchema = z.object({
  studentId: z.string(),
  topic: z.string(),
  reason: z.string(),
  skippedAt: z.string().datetime(),
});
export type RetrievalSkipped = z.infer<typeof RetrievalSkippedSchema>;

export const VerificationCompletedSchema = z.object({
  studentId: z.string(),
  topic: z.string(),
  completedAt: z.string().datetime(),
  result: z.enum(['confident', 'partial', 'needs_review']).optional(),
});
export type VerificationCompleted = z.infer<typeof VerificationCompletedSchema>;

// ============================================================================
// Tier 2 -- Protocol 2 activation events
// ============================================================================

export const FirstActionStartedSchema = z.object({
  studentId: z.string(),
  topic: z.string(),
  startedAt: z.string().datetime(),
});
export type FirstActionStarted = z.infer<typeof FirstActionStartedSchema>;

export const ReplanSchema = z.object({
  studentId: z.string(),
  topic: z.string(),
  reason: z.string().optional(),
  replannedAt: z.string().datetime(),
});
export type Replan = z.infer<typeof ReplanSchema>;

// ============================================================================
// Tier 3 -- Optional / deferrable
// ============================================================================

export const BaselineIntentSeenSchema = z.object({
  studentId: z.string(),
  source: z.string(),
  topic: z.string().optional(),
  taskType: TaskTypeEnum.optional(),
  scope: z.object({
    timeboxMin: z.number().optional(),
    questionCount: z.number().optional(),
  }).optional(),
  difficultyTier: DifficultyTierEnum.optional(),
  seenAt: z.string().datetime(),
});
export type BaselineIntentSeen = z.infer<typeof BaselineIntentSeenSchema>;

export const EffortStartSchema = z.object({
  studentId: z.string(),
  topic: z.string(),
  startedAt: z.string().datetime(),
});
export type EffortStart = z.infer<typeof EffortStartSchema>;

// ============================================================================
// Identity moment (rate-limiting / eligibility tracking)
// ============================================================================

export const IdentityMomentShownSchema = z
  .object({
    statement: z.string(),
  })
  .strict();
export type IdentityMomentShown = z.infer<typeof IdentityMomentShownSchema>;

// ============================================================================
// All event types enum (for ei_events.event_type column)
// ============================================================================

export const EventTypeEnum = z.enum([
  'AppOpen',
  'NegotiatedIntentIssued',
  'IntentResponse',
  'IntentSet',
  'ActivationPlanIssued',
  'FirstActionStarted',
  'Replan',
  'SessionEnd',
  'VerificationDecisionIssued',
  'RetrievalVerified',
  'RetrievalScheduled',
  'RetrievalSkipped',
  'VerificationCompleted',
  'StrategicAdjustmentDecision',
  'ScheduleMissed',
  'IdentityMomentShown',
]);
export type EventType = z.infer<typeof EventTypeEnum>;
