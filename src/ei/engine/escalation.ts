/**
 * Escalation logic: tightness state machine and protocol-specific escalation counters.
 * 
 * Implements:
 * - EI_Spec.md section 4.14 (Adaptive Tightness Policy)
 * - EI_Protocol_1_Ignition.md lines 146-178 (P1 failure patterns)
 * - EI_Protocol_2_Activation.md lines 119-131 (P2 escalation counters)
 * - EI_Protocol_3_Verification.md lines 177-193 (P3 escalation ladder)
 */

import {
  TIGHTNESS_LOOSE_VERIFICATION_RATE_MIN,
  TIGHTNESS_LOOSE_OPEN_LOOPS_MAX,
  TIGHTNESS_LOOSE_SCHEDULE_MISSES_MAX,
  TIGHTNESS_LOOSE_SILENCE_DAYS_MAX,
  TIGHTNESS_TIGHT_OPEN_LOOPS_MIN,
  TIGHTNESS_TIGHT_SILENCE_DAYS_MIN,
  TIGHTNESS_TIGHT_VERIFICATION_RATE_MAX,
  TIGHTNESS_TIGHT_SCHEDULE_MISSES_MIN,
  TIGHTNESS_TIGHT_AVOIDANT_EXITS_MIN,
  TIGHTNESS_TIGHT_SKIP_COUNT_MIN,
  STALL_COUNT_ESCALATION,
  REPLAN_LOOP_ESCALATION,
  P3_AVOIDANT_EXITS_ESCALATION,
  P3_SCHEDULE_MISSES_ESCALATION,
  P3_SKIP_COUNT_ESCALATION,
  AMBITION_DELTA_OVERREACH,
} from './tunables';

import type { StudentAggregates, StateTrend } from './classify';

// ============================================================================
// Tightness Level State Machine
// ============================================================================

export type TightnessLevel = 'Loose' | 'Normal' | 'Tight';

/**
 * Compute global tightness level from student aggregates.
 * 
 * From EI_Spec.md section 4.14:
 * 
 * **Loose** (all must be true):
 * - verificationRate7d >= 0.75
 * - openLoops <= 2
 * - scheduleMisses7d <= 1
 * - silenceDays < 2
 * 
 * **Tight** (any triggers):
 * - openLoops >= 3
 * - silenceDays >= 2
 * - verificationRate7d < 0.60
 * - scheduleMisses7d >= 2
 * - avoidantExits7d >= 2
 * - skipCount7d >= 3
 * 
 * **Normal**: everything else
 */
export function computeTightnessLevel(
  aggregates: StudentAggregates
): TightnessLevel {
  // Check Tight conditions first (any triggers)
  if (
    aggregates.openLoops >= TIGHTNESS_TIGHT_OPEN_LOOPS_MIN ||
    aggregates.silenceDays >= TIGHTNESS_TIGHT_SILENCE_DAYS_MIN ||
    aggregates.verificationRate7d < TIGHTNESS_TIGHT_VERIFICATION_RATE_MAX ||
    aggregates.scheduleMisses7d >= TIGHTNESS_TIGHT_SCHEDULE_MISSES_MIN ||
    aggregates.avoidantExits7d >= TIGHTNESS_TIGHT_AVOIDANT_EXITS_MIN ||
    aggregates.skipCount7d >= TIGHTNESS_TIGHT_SKIP_COUNT_MIN
  ) {
    return 'Tight';
  }

  // Check Loose conditions (all must be true)
  if (
    aggregates.verificationRate7d >= TIGHTNESS_LOOSE_VERIFICATION_RATE_MIN &&
    aggregates.openLoops <= TIGHTNESS_LOOSE_OPEN_LOOPS_MAX &&
    aggregates.scheduleMisses7d <= TIGHTNESS_LOOSE_SCHEDULE_MISSES_MAX &&
    aggregates.silenceDays <= TIGHTNESS_LOOSE_SILENCE_DAYS_MAX
  ) {
    return 'Loose';
  }

  // Default to Normal
  return 'Normal';
}

export interface ProtocolDefaults {
  minQuestionsDefault: number;
  dueInHoursDefault: number;
  scheduleAllowed: boolean;
  closeLoopsConstraint: boolean;
}

/**
 * Apply tightness-level adjustments to protocol defaults.
 * 
 * Tight -> lower minQuestions floor, shorter dueInHours, prefer VerifyNow over scheduling
 * Loose -> allow more flexibility
 */
export function applyTightnessToDefaults(
  level: TightnessLevel,
  baseDefaults: ProtocolDefaults
): ProtocolDefaults {
  const adjusted = { ...baseDefaults };

  if (level === 'Tight') {
    // Tighten: reduce dueInHours, prefer immediate verification
    adjusted.dueInHoursDefault = Math.max(24, baseDefaults.dueInHoursDefault * 0.75);
    // Note: minQuestions floor is already set by mode; tightness affects preference for VerifyNow
  }

  if (level === 'Loose') {
    // Relax: allow more flexibility
    adjusted.dueInHoursDefault = Math.min(72, baseDefaults.dueInHoursDefault * 1.5);
  }

  return adjusted;
}

// ============================================================================
// Protocol 1: Failure Pattern Detection
// ============================================================================

export interface P1FailurePatterns {
  patternA: boolean; // Revenge planning
  patternB: boolean; // Repeated rejection
  patternC: boolean; // Open-loop debt
}

export interface IntentResponseEvent {
  decision: 'accepted' | 'edited' | 'rejected' | 'ignored';
  occurredAt: Date;
}

export interface NegotiatedIntentEvent {
  ambitionDelta: number;
  occurredAt: Date;
}

/**
 * Detect Pattern A: Revenge Planning
 * 
 * From EI_Protocol_1_Ignition.md lines 146-155:
 * - High anxiety (pressure >= 4 or backlogPressure >= 4)
 * - Repeated high Ambition Delta (>= +3) over recent intents
 * - Followed by schedule misses or avoidant exits
 * 
 * This pattern indicates student is over-planning due to anxiety.
 */
export function detectPatternA(
  recentIntents: NegotiatedIntentEvent[],
  aggregates: StudentAggregates,
  currentPressure: number,
  currentBacklogPressure: number
): boolean {
  const hasHighAnxiety = currentPressure >= 4 || currentBacklogPressure >= 4;

  // Count recent intents with high ambition delta (last 7 days)
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const highAmbitionCount = recentIntents.filter(
    (intent) =>
      intent.occurredAt >= sevenDaysAgo &&
      intent.ambitionDelta >= AMBITION_DELTA_OVERREACH
  ).length;

  const hasRepeatedOverreach = highAmbitionCount >= 2;

  const hasNegativeOutcomes =
    aggregates.scheduleMisses7d >= 2 || aggregates.avoidantExits7d >= 2;

  return hasHighAnxiety && hasRepeatedOverreach && hasNegativeOutcomes;
}

/**
 * Detect Pattern B: Repeated Rejection
 * 
 * From EI_Protocol_1_Ignition.md lines 156-165:
 * - IntentResponse events show frequent rejection or ignoring
 * - IntentAcceptanceRate7d < 0.50
 * 
 * This pattern indicates negotiation is not connecting with student's actual capacity.
 */
export function detectPatternB(
  recentResponses: IntentResponseEvent[],
  aggregates: StudentAggregates
): boolean {
  // Check acceptance rate
  if (
    aggregates.intentAcceptanceRate7d !== undefined &&
    aggregates.intentAcceptanceRate7d < 0.5
  ) {
    return true;
  }

  // Also check raw response pattern (at least 3 rejections/ignores in last 7 days)
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const negativeResponseCount = recentResponses.filter(
    (response) =>
      response.occurredAt >= sevenDaysAgo &&
      (response.decision === 'rejected' || response.decision === 'ignored')
  ).length;

  return negativeResponseCount >= 3;
}

/**
 * Detect Pattern C: Open-Loop Debt
 * 
 * From EI_Protocol_1_Ignition.md lines 166-178:
 * - OpenLoops rising or persistently high (>= 3)
 * - LoopLatency worsening (time from SessionEnd to VerificationCompleted increasing)
 * 
 * This pattern indicates accumulating WIP debt that needs closure before new work.
 */
export function detectPatternC(aggregates: StudentAggregates): boolean {
  const highOpenLoops = aggregates.openLoops >= 3;
  const worseningLatency = aggregates.loopLatencyTrend === 'worsening';

  return highOpenLoops || worseningLatency;
}

/**
 * Detect all P1 failure patterns.
 */
export function getP1FailurePatterns(
  recentIntents: NegotiatedIntentEvent[],
  recentResponses: IntentResponseEvent[],
  aggregates: StudentAggregates,
  currentPressure: number,
  currentBacklogPressure: number
): P1FailurePatterns {
  return {
    patternA: detectPatternA(
      recentIntents,
      aggregates,
      currentPressure,
      currentBacklogPressure
    ),
    patternB: detectPatternB(recentResponses, aggregates),
    patternC: detectPatternC(aggregates),
  };
}

// ============================================================================
// Protocol 2: Escalation Counters
// ============================================================================

export interface P2Escalation {
  defaultToMicroStart: boolean; // Force P2-R1 (micro-start) every IntentSet
  enforceReplanCap: boolean; // Cap replans at 2, force start after
  disallowWatchOnly: boolean; // Block P2-R3 (watch-only) if P3 integrity drops
}

/**
 * Get P2 escalation flags based on recent stall/replan behavior.
 * 
 * From EI_Protocol_2_Activation.md lines 119-131:
 * - stallCount7d >= 2 -> default to P2-R1 every IntentSet
 * - replanLoopCount7d >= 2 -> enforce replanCap=2, force start after cap
 * - watchOnlyCount rising + P3 integrity drops -> disallow watch-only
 */
export function getP2Escalation(
  aggregates: StudentAggregates,
  stallCount7d: number, // sessions with STALLED label in last 7 days
  watchOnlyCount7d: number // P2-R3 plays in last 7 days
): P2Escalation {
  const defaultToMicroStart = stallCount7d >= STALL_COUNT_ESCALATION;
  const enforceReplanCap = aggregates.replanLoopCount7d >= REPLAN_LOOP_ESCALATION;

  // Disallow watch-only if: watch-only increasing AND verification rate dropping
  const disallowWatchOnly =
    watchOnlyCount7d >= 2 &&
    aggregates.verificationRate7d < TIGHTNESS_TIGHT_VERIFICATION_RATE_MAX;

  return {
    defaultToMicroStart,
    enforceReplanCap,
    disallowWatchOnly,
  };
}

// ============================================================================
// Protocol 3: Escalation Ladder
// ============================================================================

export interface P3Escalation {
  forceMinProof: boolean; // Force R3-01 (1Q unlock) before allowing exit
  preferVerifyNow: boolean; // Prefer VerifyNow over ScheduleVerify
  reduceScopeNextIntent: boolean; // Signal to P1 to reduce scope on next cycle
}

/**
 * Get P3 escalation flags based on avoidance patterns.
 * 
 * From EI_Protocol_3_Verification.md lines 177-193:
 * - avoidantExits7d >= 2 -> force R3-01 (1Q unlock) before exit
 * - scheduleMisses7d >= 2 -> prefer VerifyNow over scheduling
 * - skipCount7d >= 3 -> reduce scope + minimum verification next time
 */
export function getP3Escalation(aggregates: StudentAggregates): P3Escalation {
  const forceMinProof = aggregates.avoidantExits7d >= P3_AVOIDANT_EXITS_ESCALATION;

  const preferVerifyNow =
    aggregates.scheduleMisses7d >= P3_SCHEDULE_MISSES_ESCALATION;

  const reduceScopeNextIntent =
    aggregates.skipCount7d >= P3_SKIP_COUNT_ESCALATION;

  return {
    forceMinProof,
    preferVerifyNow,
    reduceScopeNextIntent,
  };
}

// ============================================================================
// Do-No-Harm Guardrail
// ============================================================================

/**
 * Check if tightening should be suppressed due to state collapse.
 * 
 * From EI_Spec.md line 536:
 * If StateTrend is collapsing (low energy / high anxiety / sleep debt),
 * do NOT tighten via volume. Route to Recovery instead.
 * 
 * This guardrail prevents the system from adding more pressure when the student
 * is already struggling.
 */
export function shouldSuppressTightening(
  aggregates: StudentAggregates,
  currentEnergy: number,
  currentPressure: number,
  currentSleep: '<6' | '6-7' | '7-8' | '>=8'
): boolean {
  // Check if state is collapsing
  const stateCollapsing =
    aggregates.stateTrend7d === 'worsening' ||
    currentEnergy <= 2 ||
    currentPressure >= 4 ||
    currentSleep === '<6';

  // If state is collapsing AND tightness would increase demands, suppress
  const tightnessLevel = computeTightnessLevel(aggregates);

  return stateCollapsing && tightnessLevel === 'Tight';
}

/**
 * Override mode to Recovery if do-no-harm guardrail triggers.
 */
export function applyDoNoHarmGuardrail(
  currentMode: 'Rescue' | 'Neutral' | 'Boost',
  aggregates: StudentAggregates,
  currentEnergy: number,
  currentPressure: number,
  currentSleep: '<6' | '6-7' | '7-8' | '>=8'
): 'Rescue' | 'Neutral' | 'Boost' {
  if (
    shouldSuppressTightening(
      aggregates,
      currentEnergy,
      currentPressure,
      currentSleep
    )
  ) {
    // Force to Rescue (Recovery mode) instead of tightening
    return 'Rescue';
  }

  return currentMode;
}

// ============================================================================
// Combined Escalation Context
// ============================================================================

export interface EscalationContext {
  tightnessLevel: TightnessLevel;
  p1FailurePatterns?: P1FailurePatterns;
  p2Escalation?: P2Escalation;
  p3Escalation?: P3Escalation;
  doNoHarmActive: boolean;
}

/**
 * Compute full escalation context for use by play selection.
 */
export function computeEscalationContext(
  aggregates: StudentAggregates,
  currentEnergy: number,
  currentPressure: number,
  currentBacklogPressure: number,
  currentSleep: '<6' | '6-7' | '7-8' | '>=8',
  recentIntents?: NegotiatedIntentEvent[],
  recentResponses?: IntentResponseEvent[],
  stallCount7d?: number,
  watchOnlyCount7d?: number
): EscalationContext {
  const tightnessLevel = computeTightnessLevel(aggregates);

  const p1FailurePatterns =
    recentIntents && recentResponses
      ? getP1FailurePatterns(
          recentIntents,
          recentResponses,
          aggregates,
          currentPressure,
          currentBacklogPressure
        )
      : undefined;

  const p2Escalation =
    stallCount7d !== undefined && watchOnlyCount7d !== undefined
      ? getP2Escalation(aggregates, stallCount7d, watchOnlyCount7d)
      : undefined;

  const p3Escalation = getP3Escalation(aggregates);

  const doNoHarmActive = shouldSuppressTightening(
    aggregates,
    currentEnergy,
    currentPressure,
    currentSleep
  );

  return {
    tightnessLevel,
    p1FailurePatterns,
    p2Escalation,
    p3Escalation,
    doNoHarmActive,
  };
}
