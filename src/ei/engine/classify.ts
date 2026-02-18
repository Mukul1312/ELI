/**
 * Classification functions for protocol label assignment and mode resolution.
 * 
 * Implements EI_Engine_Taxonomy.md sections 3.1-3.4 (labels) and section 4 (precedence rules).
 * 
 * Core flow:
 * 1. Assign protocol-specific label (LOW_ENERGY/HIGH_ENERGY/NEUTRAL for P1, etc.)
 * 2. Resolve mode (Rescue/Neutral/Boost) using 6 precedence rules
 * 3. Return classification context for play selection
 */

import {
  P1_LOW_ENERGY_THRESHOLD,
  P1_HIGH_ENERGY_THRESHOLD,
  P1_HIGH_PRESSURE_THRESHOLD,
  P1_HIGH_BACKLOG_THRESHOLD,
  P1_HIGH_ENERGY_PRESSURE_MAX,
  P1_HIGH_ENERGY_BACKLOG_MAX,
  P2_STALLED_LATENCY_THRESHOLD,
  P2_STALLED_REPLAN_THRESHOLD,
  P2_FLOWING_LATENCY_MAX,
  P3_AVOIDANT_VERIFICATION_RATE_MAX,
  P3_AVOIDANT_OPEN_LOOPS_MIN,
  P3_AVOIDANT_SILENCE_DAYS_MIN,
  P3_CONFIDENT_VERIFICATION_RATE_MIN,
  P3_CONFIDENT_OPEN_LOOPS_MAX,
  SILENCE_DAYS_THRESHOLD,
  OPEN_LOOPS_THRESHOLD,
} from './tunables';

import type { SleepBucket } from './score';

// ============================================================================
// Type Definitions
// ============================================================================

export type P1Label = 'LOW_ENERGY' | 'HIGH_ENERGY' | 'NEUTRAL';
export type P2Label = 'STALLED' | 'FLOWING' | 'NEUTRAL';
export type P3Label = 'AVOIDANT' | 'CONFIDENT' | 'NEUTRAL';
export type Mode = 'Rescue' | 'Neutral' | 'Boost';

export type StateTrend = 'improving' | 'flat' | 'worsening';

export interface StudentAggregates {
  pendingChecks: number;
  openLoops: number;
  verificationRate7d: number;
  scheduleMisses7d: number;
  avoidantExits7d: number;
  skipCount7d: number;
  silenceDays: number;
  startLatencyMin?: number;
  intentAcceptanceRate7d?: number;
  replanLoopCount7d: number;
  stateTrend7d: StateTrend;
  loopLatencyTrend?: 'improving' | 'worsening' | 'stable';
}

export interface StudentPolicy {
  tightnessLevel?: 'Loose' | 'Normal' | 'Tight';
  scopeMultiplier?: number;
  difficultyTierDelta?: number;
  constraints?: {
    closeLoopsFirst?: boolean;
    noNewTopicUntil?: string;
  };
}

// ============================================================================
// Protocol 1: Ignition Label Assignment
// ============================================================================

export interface P1Context {
  energy: number; // 1-5
  sleepBucket: SleepBucket;
  pressure: number; // 1-5
  backlogPressure: number; // 1-5
}

/**
 * Assign P1 label based on energy, sleep, pressure, backlog, and trend.
 * 
 * From EI_Engine_Taxonomy.md 3.1:
 * - LOW_ENERGY if ANY: energy <= 2 OR sleepBucket = "<6" OR pressure >= 4 
 *   OR backlogPressure >= 4 OR stateTrend7d = "worsening"
 * - HIGH_ENERGY if ALL: energy >= 4 AND sleepBucket in ["7-8", ">=8"] 
 *   AND pressure <= 2 AND backlogPressure <= 3 AND no active risk spike 
 *   (silenceDays < 2 AND openLoops < 3)
 * - Otherwise: NEUTRAL
 */
export function assignP1Label(
  context: P1Context,
  aggregates: StudentAggregates
): P1Label {
  // Check LOW_ENERGY conditions (ANY triggers)
  if (
    context.energy <= P1_LOW_ENERGY_THRESHOLD ||
    context.sleepBucket === '<6' ||
    context.pressure >= P1_HIGH_PRESSURE_THRESHOLD ||
    context.backlogPressure >= P1_HIGH_BACKLOG_THRESHOLD ||
    aggregates.stateTrend7d === 'worsening'
  ) {
    return 'LOW_ENERGY';
  }

  // Check HIGH_ENERGY conditions (ALL must be true)
  if (
    context.energy >= P1_HIGH_ENERGY_THRESHOLD &&
    (context.sleepBucket === '7-8' || context.sleepBucket === '>=8') &&
    context.pressure <= P1_HIGH_ENERGY_PRESSURE_MAX &&
    context.backlogPressure <= P1_HIGH_ENERGY_BACKLOG_MAX &&
    aggregates.silenceDays < SILENCE_DAYS_THRESHOLD &&
    aggregates.openLoops < OPEN_LOOPS_THRESHOLD
  ) {
    return 'HIGH_ENERGY';
  }

  return 'NEUTRAL';
}

// ============================================================================
// Protocol 2: Activation Label Assignment
// ============================================================================

export interface P2Context {
  startLatencyMin?: number; // minutes from IntentSet to FirstActionStarted
  replanCount: number; // replans before FirstActionStarted in this session
  hasStartSignal: boolean; // did we receive FirstActionStarted?
  timeSinceIntentSet: number; // minutes
}

/**
 * Assign P2 label based on start latency and replan behavior.
 * 
 * From EI_Engine_Taxonomy.md 3.2:
 * - STALLED if ANY: startLatencyMin >= 15 OR replanCount >= 2 (before FirstActionStarted)
 *   OR intent set with no start signal within 20min window
 * - FLOWING if ALL: startLatencyMin <= 3 AND no repeated replans 
 *   AND not in verification-avoidance pattern
 * - Otherwise: NEUTRAL
 */
export function assignP2Label(
  context: P2Context,
  aggregates: StudentAggregates
): P2Label {
  // Check STALLED conditions (ANY triggers)
  if (
    (context.startLatencyMin !== undefined &&
      context.startLatencyMin >= P2_STALLED_LATENCY_THRESHOLD) ||
    context.replanCount >= P2_STALLED_REPLAN_THRESHOLD ||
    (!context.hasStartSignal && context.timeSinceIntentSet >= 20)
  ) {
    return 'STALLED';
  }

  // Check FLOWING conditions (ALL must be true)
  if (
    context.startLatencyMin !== undefined &&
    context.startLatencyMin <= P2_FLOWING_LATENCY_MAX &&
    context.replanCount === 0 &&
    aggregates.verificationRate7d >= P3_CONFIDENT_VERIFICATION_RATE_MIN
  ) {
    return 'FLOWING';
  }

  return 'NEUTRAL';
}

// ============================================================================
// Protocol 3: Verification Label Assignment
// ============================================================================

export interface P3Context {
  hasRetrieval: boolean; // did session end with RetrievalVerified?
  hasSchedule: boolean; // did session end with RetrievalScheduled?
}

/**
 * Assign P3 label based on verification behavior and integrity signals.
 * 
 * From EI_Engine_Taxonomy.md 3.3:
 * - AVOIDANT if ANY: session ends with no retrieval AND no schedule 
 *   OR verificationRate7d < 0.60 OR openLoops >= 3 (or rising) OR silenceDays >= 2
 * - CONFIDENT if ALL: session ends with retrieval/schedule AND verificationRate7d >= 0.75 
 *   AND openLoops <= 2 AND integrity signals not worsening
 * - Otherwise: NEUTRAL
 */
export function assignP3Label(
  context: P3Context,
  aggregates: StudentAggregates
): P3Label {
  // Check AVOIDANT conditions (ANY triggers)
  if (
    (!context.hasRetrieval && !context.hasSchedule) ||
    aggregates.verificationRate7d < P3_AVOIDANT_VERIFICATION_RATE_MAX ||
    aggregates.openLoops >= P3_AVOIDANT_OPEN_LOOPS_MIN ||
    aggregates.silenceDays >= P3_AVOIDANT_SILENCE_DAYS_MIN
  ) {
    return 'AVOIDANT';
  }

  // Check CONFIDENT conditions (ALL must be true)
  if (
    (context.hasRetrieval || context.hasSchedule) &&
    aggregates.verificationRate7d >= P3_CONFIDENT_VERIFICATION_RATE_MIN &&
    aggregates.openLoops <= P3_CONFIDENT_OPEN_LOOPS_MAX &&
    aggregates.stateTrend7d !== 'worsening' &&
    aggregates.loopLatencyTrend !== 'worsening'
  ) {
    return 'CONFIDENT';
  }

  return 'NEUTRAL';
}

// ============================================================================
// Mode Resolution with 6 Precedence Rules
// ============================================================================

/**
 * Resolve mode (Rescue/Neutral/Boost) from label, aggregates, and policy.
 * 
 * Applies 6 precedence rules from EI_Engine_Taxonomy.md section 4:
 * 
 * 1. Integrity-first: at SessionEnd, no retrieval + no schedule -> AVOIDANT -> Rescue
 * 2. Risk overrides ambition: high OpenLoops or SilenceDays -> block Boost
 * 3. AVOIDANT overrides CONFIDENT: focus/effort never counts as confidence if verification skipped
 * 4. Stall overrides mood: STALLED -> Rescue even if energy high
 * 5. Boost requires stability + adherence (never from mood alone)
 * 6. Quality-boost override: poor efficiency trend -> method change, not volume increase
 * 
 * @returns Mode: Rescue, Neutral, or Boost
 */
export function resolveMode(
  label: P1Label | P2Label | P3Label,
  aggregates: StudentAggregates,
  policy?: StudentPolicy
): Mode {
  // Rule 1: Integrity-first (P3 AVOIDANT always goes to Rescue)
  if (label === 'AVOIDANT') {
    return 'Rescue';
  }

  // Rule 4: Stall overrides mood (P2 STALLED always goes to Rescue)
  if (label === 'STALLED') {
    return 'Rescue';
  }

  // Rule 2: Risk overrides ambition (block Boost if risk signals high)
  const hasRiskSignals =
    aggregates.openLoops >= OPEN_LOOPS_THRESHOLD ||
    aggregates.silenceDays >= SILENCE_DAYS_THRESHOLD ||
    aggregates.verificationRate7d < P3_AVOIDANT_VERIFICATION_RATE_MAX;

  if (hasRiskSignals) {
    // Even if label suggests Boost (HIGH_ENERGY, FLOWING, CONFIDENT), downgrade
    if (label === 'LOW_ENERGY') {
      return 'Rescue';
    }
    return 'Neutral'; // block Boost, but not severe enough for Rescue
  }

  // Rule 5: Boost requires stability + adherence (never from mood alone)
  const hasStability =
    aggregates.openLoops <= P3_CONFIDENT_OPEN_LOOPS_MAX &&
    aggregates.scheduleMisses7d <= 1 &&
    aggregates.verificationRate7d >= P3_CONFIDENT_VERIFICATION_RATE_MIN &&
    aggregates.stateTrend7d !== 'worsening';

  if (!hasStability) {
    // Block Boost if stability conditions not met
    if (label === 'LOW_ENERGY') {
      return 'Rescue';
    }
    return 'Neutral';
  }

  // Rule 6: Quality-boost override (if efficiency/loop latency worsening, no volume increase)
  // This is a constraint applied during play selection, not a mode change
  // The mode can still be Boost, but the play executor will apply quality-boost rules

  // Now assign mode based on label
  // Note: 'STALLED' and 'AVOIDANT' already returned 'Rescue' above; only LOW_ENERGY remains.
  if (label === 'LOW_ENERGY') {
    return 'Rescue';
  }

  if (
    label === 'HIGH_ENERGY' ||
    label === 'FLOWING' ||
    label === 'CONFIDENT'
  ) {
    // Only allow Boost if stability conditions met (already checked above)
    return 'Boost';
  }

  // NEUTRAL label or fallback
  return 'Neutral';
}

// ============================================================================
// Combined Classification (for workflow use)
// ============================================================================

export interface P1Classification {
  label: P1Label;
  mode: Mode;
  riskSignals: {
    hasRisk: boolean;
    silenceDaysHigh: boolean;
    openLoopsHigh: boolean;
    verificationRateLow: boolean;
  };
}

export function classifyP1(
  context: P1Context,
  aggregates: StudentAggregates,
  policy?: StudentPolicy
): P1Classification {
  const label = assignP1Label(context, aggregates);
  const mode = resolveMode(label, aggregates, policy);

  return {
    label,
    mode,
    riskSignals: {
      hasRisk:
        aggregates.openLoops >= OPEN_LOOPS_THRESHOLD ||
        aggregates.silenceDays >= SILENCE_DAYS_THRESHOLD ||
        aggregates.verificationRate7d < P3_AVOIDANT_VERIFICATION_RATE_MAX,
      silenceDaysHigh: aggregates.silenceDays >= SILENCE_DAYS_THRESHOLD,
      openLoopsHigh: aggregates.openLoops >= OPEN_LOOPS_THRESHOLD,
      verificationRateLow:
        aggregates.verificationRate7d < P3_AVOIDANT_VERIFICATION_RATE_MAX,
    },
  };
}

export interface P2Classification {
  label: P2Label;
  mode: Mode;
  stallInfo: {
    isStalled: boolean;
    highLatency: boolean;
    repeatedReplans: boolean;
    noStartSignal: boolean;
  };
}

export function classifyP2(
  context: P2Context,
  aggregates: StudentAggregates,
  policy?: StudentPolicy
): P2Classification {
  const label = assignP2Label(context, aggregates);
  const mode = resolveMode(label, aggregates, policy);

  return {
    label,
    mode,
    stallInfo: {
      isStalled: label === 'STALLED',
      highLatency:
        context.startLatencyMin !== undefined &&
        context.startLatencyMin >= P2_STALLED_LATENCY_THRESHOLD,
      repeatedReplans: context.replanCount >= P2_STALLED_REPLAN_THRESHOLD,
      noStartSignal: !context.hasStartSignal && context.timeSinceIntentSet >= 20,
    },
  };
}

export interface P3Classification {
  label: P3Label;
  mode: Mode;
  integrityInfo: {
    isAvoidant: boolean;
    hasRetrieval: boolean;
    hasSchedule: boolean;
    verificationRateLow: boolean;
    openLoopsHigh: boolean;
  };
}

export function classifyP3(
  context: P3Context,
  aggregates: StudentAggregates,
  policy?: StudentPolicy
): P3Classification {
  const label = assignP3Label(context, aggregates);
  const mode = resolveMode(label, aggregates, policy);

  return {
    label,
    mode,
    integrityInfo: {
      isAvoidant: label === 'AVOIDANT',
      hasRetrieval: context.hasRetrieval,
      hasSchedule: context.hasSchedule,
      verificationRateLow:
        aggregates.verificationRate7d < P3_AVOIDANT_VERIFICATION_RATE_MAX,
      openLoopsHigh: aggregates.openLoops >= P3_AVOIDANT_OPEN_LOOPS_MIN,
    },
  };
}
