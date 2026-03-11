/**
 * Zod schemas for protocol output contracts.
 *
 * Source: EI_Engine_Taxonomy.md section 5
 */

import { z } from 'zod';
import { DifficultyTierEnum, VerificationFormatEnum, SleepBucketEnum, SessionTaskTypeEnum } from './events';

// ============================================================================
// Mode enum (shared across all protocols)
// ============================================================================

export const ModeEnum = z.enum(['Rescue', 'Neutral', 'Boost']);
export type Mode = z.infer<typeof ModeEnum>;

// ============================================================================
// Protocol 1 output: SessionIntentIssued (both negotiated and declared paths)
// ============================================================================

export const SessionIntentIssuedSchema = z.object({
  // ── always present ──────────────────────────────────────────────────────────
  studentId: z.string(),
  topicId: z.string(),
  /** Discriminator: 'negotiated' (ELI-driven) or 'declared' (student-driven). */
  intentSource: z.enum(['negotiated', 'declared']),
  timebox: z.number(),                   // scope.timeboxMin for negotiated; student input for declared
  taskType: SessionTaskTypeEnum,         // 'Learn' | 'Practice' | 'Test'
  energy: z.number().int().min(1).max(5),
  sleepBucket: SleepBucketEnum,
  issuedAt: z.string().datetime(),
  // Keep topic/topicName for Mastra workflow compat
  topic: z.string().optional(),
  topicName: z.string().optional(),
  // ── negotiated-only (null for declared) ─────────────────────────────────────
  mode: ModeEnum.nullable(),
  playId: z.string().nullable(),
  /** P1 floor for P3 cross-protocol enforcement. null = no floor (declared sessions). */
  verificationFloor: z.object({
    minQuestions: z.number().int(),
    preferVerifyNow: z.boolean(),
  }).nullable(),
  constraints: z.object({
    closeOpenLoopFirst: z.boolean().optional(),
    noNewTopicUntil: z.string().optional(),
  }).nullable(),
  stateScore: z.number().nullable(),
  questionCount: z.number().nullable(),
  difficultyTier: DifficultyTierEnum.nullable(),
  /** Was negotiatedIntentId. null for declared sessions. */
  sessionIntentId: z.string().nullable(),
});
export type SessionIntentIssuedOutput = z.infer<typeof SessionIntentIssuedSchema>;

/** @deprecated Use SessionIntentIssuedSchema. Kept for any remaining references during migration. */
export const NegotiatedIntentIssuedSchema = SessionIntentIssuedSchema;
/** @deprecated Use SessionIntentIssuedOutput. */
export type NegotiatedIntentIssuedOutput = SessionIntentIssuedOutput;

// ============================================================================
// Protocol 2 output: ActivationPlanIssued
// ============================================================================

export const ActivationPlanIssuedSchema = z.object({
  studentId: z.string(),
  mode: ModeEnum,
  playId: z.string(),
  topic: z.string().optional(),
  topicName: z.string().optional(),
  firstAction: z.object({
    type: z.enum(['solve_q1', 'watch_only', 'standard', 'hard_first', 'continue_last']),
    timeboxMin: z.number().optional(),
    timeboxSec: z.number().optional(),
    description: z.string().optional(),
  }),
  replanCap: z.number().int().optional(),
  focusContract: z.object({
    noSwitchingUntil: z.number().optional(),
  }).optional(),
  allowedFallback: z.object({
    enforceWatchOnlyVerification: z.boolean().optional(),
  }).optional(),
  rationale: z.string().optional(),
  issuedAt: z.string().datetime(),
});
export type ActivationPlanIssuedOutput = z.infer<typeof ActivationPlanIssuedSchema>;

// ============================================================================
// Protocol 3 output: VerificationDecisionIssued
// ============================================================================

export const VerificationDecisionIssuedSchema = z.object({
  studentId: z.string(),
  mode: ModeEnum,
  playId: z.string(),
  topic: z.string(),
  topicName: z.string().optional(),
  verificationDecision: z.enum(['VerifyNow', 'ScheduleVerify', 'Skip']),
  verificationSpec: z.object({
    minQuestions: z.number().int(),
    timeboxSec: z.number().optional(),
    difficultyTier: DifficultyTierEnum.optional(),
    format: VerificationFormatEnum.optional(),
  }).optional(),
  deadlineSpec: z.object({
    dueInHours: z.number(),
    graceHours: z.number(),
    minQuestions: z.number().int(),
  }).optional(),
  reason: z.string().optional(),
  rationale: z.string().optional(),
  sessionDurationSec: z.number().int().nonnegative().optional(),
  dropoutSignalActive: z.boolean().optional(),
  taskType: z.string().optional(),
  issuedAt: z.string().datetime(),
});
export type VerificationDecisionIssuedOutput = z.infer<typeof VerificationDecisionIssuedSchema>;

// ============================================================================
// Strategic Adjustment output
// ============================================================================

export const AdjustmentModeEnum = z.enum([
  'Recovery',
  'DifficultyRaise',
  'TechniquePivot',
  'CloseLoopsFirst',
  'IntegrityClamp',
]);
export type AdjustmentMode = z.infer<typeof AdjustmentModeEnum>;

export const SADialsSchema = z.object({
  scopeMultiplier: z.number(),
  difficultyTierDelta: z.number().int(),
  minQuestionsDefault: z.number().int(),
  scheduleAllowed: z.boolean(),
  dueInHoursDefault: z.number().optional(),
});

export const SAConstraintsSchema = z.object({
  closeOldestOpenLoopFirst: z.boolean().optional(),
  /** @deprecated Use closeOldestOpenLoopFirst */
  closeLoopsFirst: z.boolean().optional(),
  noNewTopicUntil: z.string().optional(),
  maxOpenLoops: z.number().int().optional(),
  forceQualityVerification: z.boolean().optional(),
});

export const StrategicAdjustmentDecisionSchema = z.object({
  studentId: z.string(),
  adjustmentMode: AdjustmentModeEnum,
  dials: SADialsSchema,
  nextCycleConstraints: SAConstraintsSchema.optional(),
  tightnessLevel: z.string().optional(),
  diagnosis: z.enum(['junkVolume', 'luckyGuesser', 'normal']).optional(),
  rationale: z.string().optional(),
  issuedAt: z.string().datetime(),
});
export type StrategicAdjustmentDecisionOutput = z.infer<typeof StrategicAdjustmentDecisionSchema>;
