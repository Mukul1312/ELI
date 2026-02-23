/**
 * Zod schemas for derived signals, topic state, and student policy.
 *
 * Source: EI_Engine_Taxonomy.md section 2
 */

import { z } from 'zod';

// ============================================================================
// Student Aggregates (derived signals, recomputed after every event)
// ============================================================================

export const StateTrendEnum = z.enum(['improving', 'flat', 'worsening']);
export type StateTrend = z.infer<typeof StateTrendEnum>;

export const LoopLatencyTrendEnum = z.enum(['improving', 'stable', 'worsening']);

export const StudentAggregatesSchema = z.object({
  studentId: z.string(),
  pendingChecks: z.number().int(),
  openLoops: z.number().int(),
  verificationRate7d: z.number(),
  scheduleMisses7d: z.number().int(),
  avoidantExits7d: z.number().int(),
  skipCount7d: z.number().int(),
  silenceDays: z.number().int(),
  startLatencyMinMedian7d: z.number().optional(),
  intentAcceptanceRate7d: z.number().optional(),
  replanLoopCount7d: z.number().int(),
  stateTrend7d: StateTrendEnum,
  loopLatencyTrend: LoopLatencyTrendEnum.optional(),
  updatedAt: z.string().datetime(),
});
export type StudentAggregates = z.infer<typeof StudentAggregatesSchema>;

// ============================================================================
// Topic State (per student + topic)
// ============================================================================

export const TopicStateSchema = z.object({
  studentId: z.string(),
  topicId: z.string(),
  topicStep: z.string().optional(),
  lastEffortAt: z.string().datetime().nullable(),
  lastRetrievalAt: z.string().datetime().nullable(),
  lastScheduledDueAt: z.string().datetime().nullable(),
  tms: z.number().min(0).max(1),
  deltaDecay: z.number(),
  updatedAt: z.string().datetime(),
});
export type TopicState = z.infer<typeof TopicStateSchema>;

// ============================================================================
// Student Policy (written by Strategic Adjustment, read by all protocols)
// ============================================================================

export const TightnessLevelEnum = z.enum(['Loose', 'Normal', 'Tight']);
export type TightnessLevel = z.infer<typeof TightnessLevelEnum>;

export const StudentPolicySchema = z.object({
  studentId: z.string(),
  tightnessLevel: TightnessLevelEnum,
  adjustmentMode: z.string().optional(),
  dials: z.object({
    scopeMultiplier: z.number().optional(),
    difficultyTierDelta: z.number().int().optional(),
    minQuestionsDefault: z.number().int().optional(),
    scheduleAllowed: z.boolean().optional(),
    dueInHoursDefault: z.number().optional(),
  }).optional(),
  constraints: z.object({
    closeOldestOpenLoopFirst: z.boolean().optional(),
    /** @deprecated Use closeOldestOpenLoopFirst */
    closeLoopsFirst: z.boolean().optional(),
    noNewTopicUntil: z.string().optional(),
    maxOpenLoops: z.number().int().optional(),
    forceQualityVerification: z.boolean().optional(),
  }).optional(),
  updatedAt: z.string().datetime(),
});
export type StudentPolicy = z.infer<typeof StudentPolicySchema>;
