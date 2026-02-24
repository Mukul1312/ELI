/**
 * Strategic Adjustment pattern-matching engine.
 * 
 * Implements:
 * - EI_Spec.md section 4.8 (4-scenario delta matrix)
 * - EI_Spec.md sections 4.6-4.7 (Integrity Metrics and Cognitive Diagnostics)
 * - EI_Spec.md section 4.14 (Adaptive Tightness Policy integration)
 * 
 * This module analyzes delta patterns over a review window (7-14 days) and matches
 * them to one of 4 strategic scenarios, then computes appropriate dial adjustments.
 */

import type { StudentAggregates } from './classify';
import type { DifficultyTier } from './score';

import {
  SA_RECOVERY_SCOPE_MULTIPLIER_MIN,
  SA_RECOVERY_SCOPE_MULTIPLIER_MAX,
  SA_RECOVERY_DIFFICULTY_DELTA,
  SA_RECOVERY_MIN_QUESTIONS,
  SA_RECOVERY_SCHEDULE_ALLOWED,
  SA_RECOVERY_DUE_IN_HOURS,
  SA_RECOVERY_MAX_OPEN_LOOPS,
  SA_COASTER_DIFFICULTY_DELTA,
  SA_COASTER_SCOPE_MULTIPLIER,
  SA_COASTER_MIN_QUESTIONS_MIN,
  SA_COASTER_MIN_QUESTIONS_MAX,
  SA_GRINDER_SCOPE_MULTIPLIER,
  SA_GRINDER_DIFFICULTY_DELTA,
  SA_GRINDER_MIN_QUESTIONS,
  SA_INTEGRITY_SCOPE_MULTIPLIER_MIN,
  SA_INTEGRITY_SCOPE_MULTIPLIER_MAX,
  SA_INTEGRITY_MAX_OPEN_LOOPS,
  AMBITION_DELTA_OVERREACH,
  AMBITION_DELTA_SANDBAGGING,
  OPEN_LOOPS_THRESHOLD,
} from './tunables';

// ============================================================================
// Delta Metrics (Integrity Metrics from EI_Spec.md 4.6)
// ============================================================================

export interface DeltaMetrics {
  ambitionDelta: number; // avg(IntentScore - StateScore) over review window
  executionDelta: number; // (effortDays / scheduledDays) - target
  efficiencyDelta: number; // (TMS improvement / effort) - baseline
  perceptionDelta: number; // self-reported energy/pressure trend
}

/**
 * Classify Ambition Delta.
 */
export type AmbitionLevel = 'overreach' | 'sandbagging' | 'appropriate';

export function classifyAmbitionDelta(delta: number): AmbitionLevel {
  if (delta >= AMBITION_DELTA_OVERREACH) {
    return 'overreach';
  } else if (delta <= AMBITION_DELTA_SANDBAGGING) {
    return 'sandbagging';
  } else {
    return 'appropriate';
  }
}

/**
 * Classify Execution Delta.
 */
export type ExecutionLevel = 'high' | 'balanced' | 'low';

export function classifyExecutionDelta(delta: number): ExecutionLevel {
  if (delta >= 0.2) {
    return 'high'; // executing more than planned
  } else if (delta <= -0.2) {
    return 'low'; // executing less than planned
  } else {
    return 'balanced';
  }
}

/**
 * Classify Efficiency Delta.
 */
export type EfficiencyLevel = 'high' | 'normal' | 'low';

export function classifyEfficiencyDelta(delta: number): EfficiencyLevel {
  if (delta >= 0.15) {
    return 'high'; // learning faster than baseline
  } else if (delta <= -0.15) {
    return 'low'; // grinding without results
  } else {
    return 'normal';
  }
}

/**
 * Classify Perception Delta.
 */
export type PerceptionTrend = 'positive' | 'neutral' | 'negative';

export function classifyPerceptionDelta(delta: number): PerceptionTrend {
  if (delta >= 0.5) {
    return 'positive'; // self-reported improving
  } else if (delta <= -0.5) {
    return 'negative'; // self-reported worsening
  } else {
    return 'neutral';
  }
}

// ============================================================================
// Adjustment Modes (4 Strategic Scenarios)
// ============================================================================

export type AdjustmentMode =
  | 'Recovery'        // The Burnout: reduce scope, easy difficulty, tight verification
  | 'DifficultyRaise' // The Coaster: increase difficulty, maintain scope
  | 'TechniquePivot'  // The Grinder: quality over volume, error-log verification
  | 'CloseLoopsFirst' // Integrity Debt: close WIP, reduce new work
  | 'IntegrityClamp'; // Severe integrity debt: schedule disallowed, max loops=2

/**
 * Match delta patterns to one of 4 strategic scenarios.
 * 
 * From EI_Spec.md 4.8 matrix:
 * 
 * 1. **The Burnout**: high Ambition Delta (over-planning) + low Efficiency Delta 
 *    (grinding w/o results) + negative Perception Delta -> Recovery
 * 
 * 2. **The Coaster**: low Ambition Delta (under-planning) + high Efficiency Delta 
 *    (easy wins) + positive/complacent Perception Delta -> DifficultyRaise
 *    Guardrail: if OpenLoops >= 3, switch to CloseLoopsFirst
 * 
 * 3. **The Grinder**: balanced Ambition Delta + low Efficiency Delta (struggling) 
 *    + balanced Perception Delta -> TechniquePivot
 * 
 * 4. **Integrity Debt**: any deltas + high OpenLoops or scheduleMisses or 
 *    verificationRate falling -> CloseLoopsFirst or IntegrityClamp
 * 
 * Override rule: if OpenLoops high/rising or LoopLatency worsening, prioritize 
 * CloseLoopsFirst even if State/energy is high.
 */
export function matchScenario(
  deltas: DeltaMetrics,
  aggregates: StudentAggregates
): AdjustmentMode {
  const ambitionLevel = classifyAmbitionDelta(deltas.ambitionDelta);
  const executionLevel = classifyExecutionDelta(deltas.executionDelta);
  const efficiencyLevel = classifyEfficiencyDelta(deltas.efficiencyDelta);
  const perceptionTrend = classifyPerceptionDelta(deltas.perceptionDelta);

  // Check for Integrity Debt first (highest priority)
  const hasIntegrityDebt =
    aggregates.openLoops >= OPEN_LOOPS_THRESHOLD ||
    aggregates.scheduleMisses7d >= 2 ||
    aggregates.verificationRate7d < 0.60 ||
    aggregates.loopLatencyTrend === 'worsening';

  if (hasIntegrityDebt) {
    // Severe integrity debt -> IntegrityClamp
    if (
      aggregates.openLoops >= 5 ||
      aggregates.scheduleMisses7d >= 3 ||
      aggregates.verificationRate7d < 0.50
    ) {
      return 'IntegrityClamp';
    }
    // Moderate integrity debt -> CloseLoopsFirst
    return 'CloseLoopsFirst';
  }

  // Match to 3 main scenarios

  // 1. The Burnout: overreach + low efficiency + negative perception
  if (
    ambitionLevel === 'overreach' &&
    efficiencyLevel === 'low' &&
    perceptionTrend === 'negative'
  ) {
    return 'Recovery';
  }

  // 2. The Coaster: sandbagging + high efficiency + positive perception
  if (
    ambitionLevel === 'sandbagging' &&
    efficiencyLevel === 'high' &&
    (perceptionTrend === 'positive' || perceptionTrend === 'neutral')
  ) {
    // Guardrail: if OpenLoops >= 3, switch to CloseLoopsFirst
    if (aggregates.openLoops >= 3) {
      return 'CloseLoopsFirst';
    }
    return 'DifficultyRaise';
  }

  // 3. The Grinder: balanced ambition + low efficiency + balanced perception
  if (
    (ambitionLevel === 'appropriate' || executionLevel === 'balanced') &&
    efficiencyLevel === 'low' &&
    perceptionTrend !== 'negative'
  ) {
    return 'TechniquePivot';
  }

  // Additional heuristic: if efficiency low but no clear scenario, default to TechniquePivot
  if (efficiencyLevel === 'low') {
    return 'TechniquePivot';
  }

  // Additional heuristic: if negative perception + low execution, default to Recovery
  if (perceptionTrend === 'negative' && executionLevel === 'low') {
    return 'Recovery';
  }

  // Default: no clear adjustment needed, maintain current policy (represented as Neutral/DifficultyRaise)
  return 'DifficultyRaise'; // Placeholder: could also be "NoChange" mode
}

// ============================================================================
// Dial Values (Strategic Adjustment Output)
// ============================================================================

export interface SADials {
  scopeMultiplier: number; // multiply default scope ranges
  difficultyTierDelta: number; // -1, 0, +1, +2, +3 to adjust difficulty
  minQuestionsDefault: number; // minimum verification questions
  scheduleAllowed: boolean; // can P3 use ScheduleVerify?
  dueInHoursDefault?: number; // default scheduling window
  constraints: {
    noNewTopicUntil?: string; // e.g., "1LoopClosed"
    closeOldestOpenLoopFirst?: boolean; // must close oldest open loop before new topic
    maxOpenLoops?: number;
    forceQualityVerification?: boolean; // error-log/recall format
  };
}

/**
 * Compute dial values from adjustment mode and current state.
 * 
 * Maps each AdjustmentMode to concrete dial values per EI_Spec.md 4.8 table:
 * 
 * - **Recovery**: scopeMultiplier=0.6-0.8, difficultyTierDelta=0 or -1, 
 *   minQuestionsDefault=1, scheduleAllowed=true, dueInHoursDefault=24, maxOpenLoops=2
 * 
 * - **DifficultyRaise**: scopeMultiplier=1.0, difficultyTierDelta=+1, 
 *   minQuestionsDefault=3-5, scheduleAllowed=true
 * 
 * - **TechniquePivot**: scopeMultiplier=1.0, difficultyTierDelta=0, 
 *   minQuestionsDefault=3, force quality verification format=error_log/recall
 * 
 * - **CloseLoopsFirst / IntegrityClamp**: scopeMultiplier=0.8-1.0, 
 *   scheduleAllowed=false if scheduleMisses >= 2, constraints: 
 *   noNewTopicUntil=1LoopClosed, closeOldestOpenLoopFirst=true, maxOpenLoops=2
 */
export function computeDials(
  mode: AdjustmentMode,
  aggregates: StudentAggregates
): SADials {
  const dials: SADials = {
    scopeMultiplier: 1.0,
    difficultyTierDelta: 0,
    minQuestionsDefault: 2,
    scheduleAllowed: true,
    constraints: {},
  };

  switch (mode) {
    case 'Recovery':
      dials.scopeMultiplier =
        aggregates.stateTrend7d === 'worsening'
          ? SA_RECOVERY_SCOPE_MULTIPLIER_MIN
          : SA_RECOVERY_SCOPE_MULTIPLIER_MAX;
      dials.difficultyTierDelta = SA_RECOVERY_DIFFICULTY_DELTA;
      dials.minQuestionsDefault = SA_RECOVERY_MIN_QUESTIONS;
      dials.scheduleAllowed = SA_RECOVERY_SCHEDULE_ALLOWED;
      dials.dueInHoursDefault = SA_RECOVERY_DUE_IN_HOURS;
      dials.constraints.maxOpenLoops = SA_RECOVERY_MAX_OPEN_LOOPS;
      break;

    case 'DifficultyRaise':
      dials.scopeMultiplier = SA_COASTER_SCOPE_MULTIPLIER;
      dials.difficultyTierDelta = SA_COASTER_DIFFICULTY_DELTA;
      dials.minQuestionsDefault = Math.round(
        (SA_COASTER_MIN_QUESTIONS_MIN + SA_COASTER_MIN_QUESTIONS_MAX) / 2
      );
      dials.scheduleAllowed = true;
      break;

    case 'TechniquePivot':
      dials.scopeMultiplier = SA_GRINDER_SCOPE_MULTIPLIER;
      dials.difficultyTierDelta = SA_GRINDER_DIFFICULTY_DELTA;
      dials.minQuestionsDefault = SA_GRINDER_MIN_QUESTIONS;
      dials.scheduleAllowed = true;
      dials.constraints.forceQualityVerification = true; // error-log/recall format
      break;

    case 'CloseLoopsFirst':
      dials.scopeMultiplier = Math.round(
        (SA_INTEGRITY_SCOPE_MULTIPLIER_MIN + SA_INTEGRITY_SCOPE_MULTIPLIER_MAX) / 2 *
          100
      ) / 100;
      dials.difficultyTierDelta = 0; // maintain difficulty
      dials.minQuestionsDefault = 2;
      dials.scheduleAllowed = aggregates.scheduleMisses7d < 2; // disallow if misses >= 2
      dials.constraints.noNewTopicUntil = '1LoopClosed';
      dials.constraints.closeOldestOpenLoopFirst = true;
      dials.constraints.maxOpenLoops = SA_INTEGRITY_MAX_OPEN_LOOPS;
      break;

    case 'IntegrityClamp':
      dials.scopeMultiplier = SA_INTEGRITY_SCOPE_MULTIPLIER_MIN;
      dials.difficultyTierDelta = 0;
      dials.minQuestionsDefault = 1; // absolute minimum
      dials.scheduleAllowed = false; // force VerifyNow only
      dials.constraints.noNewTopicUntil = '1LoopClosed';
      dials.constraints.closeOldestOpenLoopFirst = true;
      dials.constraints.maxOpenLoops = 2;
      break;
  }

  return dials;
}

// ============================================================================
// Cognitive Diagnostics (Efficiency Analysis from EI_Spec.md 4.7)
// ============================================================================

export type EfficiencyDiagnosis = 'junkVolume' | 'luckyGuesser' | 'normal';

export interface TopicState {
  topicId: string;
  effortCount7d: number; // number of SessionEnd events
  retrievalCount7d: number; // number of RetrievalVerified events
  tms: number; // Topic Mastery Score
  deltaDecay: number; // TMS decay rate
}

/**
 * Diagnose efficiency patterns from topic states and events.
 * 
 * From EI_Spec.md 4.7:
 * 
 * - **Junk Volume**: high effort + low retrieval -> TechniquePivot
 *   (student is putting in time but not learning/verifying)
 * 
 * - **Lucky Guesser / Already Mastered**: low effort + high retrieval -> DifficultyRaise
 *   (student is breezing through, needs harder material)
 *   Guardrail: require consistent evidence before promoting
 * 
 * - **Normal**: balanced effort/retrieval ratio
 */
export function computeEfficiencyDiagnosis(
  topicStates: TopicState[]
): EfficiencyDiagnosis {
  // Compute aggregate effort/retrieval ratio
  const totalEffort = topicStates.reduce((sum, t) => sum + t.effortCount7d, 0);
  const totalRetrieval = topicStates.reduce((sum, t) => sum + t.retrievalCount7d, 0);

  if (totalEffort === 0) {
    return 'normal'; // no data
  }

  const retrievalRate = totalRetrieval / totalEffort;

  // Junk Volume: high effort, low retrieval (< 0.40)
  if (totalEffort >= 5 && retrievalRate < 0.40) {
    return 'junkVolume';
  }

  // Lucky Guesser: low effort, high retrieval (> 0.90)
  if (totalEffort <= 3 && retrievalRate > 0.90) {
    // Guardrail: check if TMS is already high (already mastered)
    const avgTMS = topicStates.reduce((sum, t) => sum + t.tms, 0) / topicStates.length;
    if (avgTMS >= 0.80) {
      return 'luckyGuesser'; // likely already mastered
    }
  }

  return 'normal';
}

/**
 * Apply efficiency diagnosis to adjustment mode.
 * 
 * This can override the delta-based scenario matching if efficiency patterns are strong.
 */
export function applyEfficiencyDiagnosis(
  mode: AdjustmentMode,
  diagnosis: EfficiencyDiagnosis
): AdjustmentMode {
  if (diagnosis === 'junkVolume') {
    // Override to TechniquePivot (quality over volume)
    return 'TechniquePivot';
  }

  if (diagnosis === 'luckyGuesser') {
    // Override to DifficultyRaise (promote to harder material)
    return 'DifficultyRaise';
  }

  return mode; // no override
}

// ============================================================================
// Combined Strategic Adjustment Decision
// ============================================================================

export interface StrategicAdjustmentDecision {
  mode: AdjustmentMode;
  dials: SADials;
  diagnosis: EfficiencyDiagnosis;
  deltas: DeltaMetrics;
  rationale?: string; // Optional: filled by Agent later
}

/**
 * Main strategic adjustment function.
 * 
 * Takes delta metrics, aggregates, and topic states, then:
 * 1. Match scenario from deltas
 * 2. Compute efficiency diagnosis
 * 3. Apply diagnosis override if needed
 * 4. Compute dials from final mode
 */
export function computeStrategicAdjustment(
  deltas: DeltaMetrics,
  aggregates: StudentAggregates,
  topicStates: TopicState[]
): StrategicAdjustmentDecision {
  // Step 1: Match scenario from delta patterns
  let mode = matchScenario(deltas, aggregates);

  // Step 2: Compute efficiency diagnosis
  const diagnosis = computeEfficiencyDiagnosis(topicStates);

  // Step 3: Apply efficiency diagnosis override
  mode = applyEfficiencyDiagnosis(mode, diagnosis);

  // Step 4: Compute dials from final mode
  const dials = computeDials(mode, aggregates);

  return {
    mode,
    dials,
    diagnosis,
    deltas,
  };
}
