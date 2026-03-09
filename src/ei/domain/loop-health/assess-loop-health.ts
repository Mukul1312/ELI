/**
 * Pure classification logic for LoopHealth.
 * Single source of truth for "what is healthy" — labels and precedence rules.
 * Per tactical/loop-health-assessment-tactical-spec.md, EI_Engine_Taxonomy.md §3–4.
 */

import {
  P1_LOW_ENERGY_THRESHOLD,
  P1_HIGH_ENERGY_THRESHOLD,
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
import type {
  LoopHealthSnapshot,
  LoopHealthEvidence,
  P1Label,
  P2Label,
  P3Label,
  Mode,
} from './loop-health-snapshot';
import type { P1Context, P2Context, P3Context } from './gate-context';
import type { StudentAggregatesInput, StudentPolicyInput } from './aggregates-input';

// Re-export for engine facade; type aliases for backward compat with engine/classify
export type { P1Label, P2Label, P3Label, Mode };
export type { P1Context, P2Context, P3Context };
export type { StudentAggregatesInput, StudentPolicyInput };
export type StudentAggregates = StudentAggregatesInput;
export type StudentPolicy = StudentPolicyInput;

/**
 * Assign P1 label from energy, sleep, highPressureDetected.
 */
export function assignP1Label(
  context: P1Context,
  aggregates: StudentAggregatesInput
): P1Label {
  if (
    context.energy <= P1_LOW_ENERGY_THRESHOLD ||
    context.sleepBucket === '<6' ||
    context.highPressureDetected
  ) {
    return 'LOW_ENERGY';
  }
  if (
    context.energy >= P1_HIGH_ENERGY_THRESHOLD &&
    (context.sleepBucket === '7-8' || context.sleepBucket === '>=8') &&
    !context.highPressureDetected &&
    aggregates.silenceDays < SILENCE_DAYS_THRESHOLD &&
    aggregates.openLoops < OPEN_LOOPS_THRESHOLD
  ) {
    return 'HIGH_ENERGY';
  }
  return 'NEUTRAL';
}

/**
 * Assign P2 label from start latency and replan behavior.
 */
export function assignP2Label(
  context: P2Context,
  aggregates: StudentAggregatesInput
): P2Label {
  if (
    (context.startLatencyMin !== undefined &&
      context.startLatencyMin >= P2_STALLED_LATENCY_THRESHOLD) ||
    context.replanCount >= P2_STALLED_REPLAN_THRESHOLD ||
    (!context.hasStartSignal && context.timeSinceIntentSet >= 20)
  ) {
    return 'STALLED';
  }
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

/**
 * Assign P3 label from verification behavior and integrity signals.
 */
export function assignP3Label(
  context: P3Context,
  aggregates: StudentAggregatesInput
): P3Label {
  if (
    (!context.hasRetrieval && !context.hasSchedule) ||
    aggregates.verificationRate7d < P3_AVOIDANT_VERIFICATION_RATE_MAX ||
    aggregates.openLoops >= P3_AVOIDANT_OPEN_LOOPS_MIN ||
    aggregates.silenceDays >= P3_AVOIDANT_SILENCE_DAYS_MIN
  ) {
    return 'AVOIDANT';
  }
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

/**
 * Resolve mode from label + aggregates using 6 precedence rules.
 */
export function resolveMode(
  label: P1Label | P2Label | P3Label,
  aggregates: StudentAggregatesInput,
  policy?: StudentPolicyInput
): Mode {
  if (label === 'AVOIDANT') return 'Rescue';
  if (label === 'STALLED') return 'Rescue';

  const hasRiskSignals =
    aggregates.openLoops >= OPEN_LOOPS_THRESHOLD ||
    aggregates.silenceDays >= SILENCE_DAYS_THRESHOLD ||
    aggregates.verificationRate7d < P3_AVOIDANT_VERIFICATION_RATE_MAX;

  if (hasRiskSignals) {
    if (label === 'LOW_ENERGY') return 'Rescue';
    return 'Neutral';
  }

  const hasStability =
    aggregates.openLoops <= P3_CONFIDENT_OPEN_LOOPS_MAX &&
    aggregates.scheduleMisses7d <= 1 &&
    aggregates.verificationRate7d >= P3_CONFIDENT_VERIFICATION_RATE_MIN &&
    aggregates.stateTrend7d !== 'worsening';

  if (!hasStability) {
    if (label === 'LOW_ENERGY') return 'Rescue';
    return 'Neutral';
  }

  if (label === 'LOW_ENERGY') return 'Rescue';
  if (label === 'HIGH_ENERGY' || label === 'FLOWING' || label === 'CONFIDENT') {
    return 'Boost';
  }
  return 'Neutral';
}

function buildEvidence(aggregates: StudentAggregatesInput): LoopHealthEvidence {
  return {
    openLoops: aggregates.openLoops,
    verificationRate7d: aggregates.verificationRate7d,
    silenceDays: aggregates.silenceDays,
    scheduleMisses7d: aggregates.scheduleMisses7d,
    startLatencyMin: aggregates.startLatencyMin,
    stateTrend7d: aggregates.stateTrend7d,
    loopLatencyTrend: aggregates.loopLatencyTrend,
  };
}

function defaultP1Context(): P1Context {
  return { energy: 3, sleepBucket: '7-8', highPressureDetected: false };
}

function defaultP2Context(aggregates: StudentAggregatesInput): P2Context {
  return {
    startLatencyMin: aggregates.startLatencyMin,
    replanCount: 0,
    hasStartSignal: true,
    timeSinceIntentSet: 0,
  };
}

function defaultP3Context(): P3Context {
  return { hasRetrieval: true, hasSchedule: true };
}

export type GatePhase = 'P1' | 'P2' | 'P3';

/**
 * Pure function: compute full LoopHealthSnapshot from aggregates and gate context.
 * When gateContext is for one phase, uses defaults for the other phases.
 */
export function assessLoopHealth(
  studentId: string,
  aggregates: StudentAggregatesInput,
  gateContext: P1Context | P2Context | P3Context,
  policy: StudentPolicyInput | undefined,
  gatePhase: GatePhase | undefined,
  computedAt: string
): LoopHealthSnapshot {
  const p1Ctx: P1Context =
    'energy' in gateContext ? gateContext : defaultP1Context();
  const p2Ctx: P2Context =
    'replanCount' in gateContext ? gateContext : defaultP2Context(aggregates);
  const p3Ctx: P3Context =
    'hasRetrieval' in gateContext ? gateContext : defaultP3Context();

  const p1 = assignP1Label(p1Ctx, aggregates);
  const p2 = assignP2Label(p2Ctx, aggregates);
  const p3 = assignP3Label(p3Ctx, aggregates);

  let mode: Mode;
  if (gatePhase) {
    const activeLabel = gatePhase === 'P1' ? p1 : gatePhase === 'P2' ? p2 : p3;
    mode = resolveMode(activeLabel, aggregates, policy);
  } else {
    mode = 'Neutral';
    const labels: (P1Label | P2Label | P3Label)[] = [p1, p2, p3];
    for (const lbl of labels) {
      const m = resolveMode(lbl, aggregates, policy);
      if (m === 'Rescue') {
        mode = 'Rescue';
        break;
      }
      if (m === 'Boost') mode = 'Boost';
    }
  }

  return {
    studentId,
    p1,
    p2,
    p3,
    mode,
    evidence: buildEvidence(aggregates),
    computedAt,
  };
}

// Legacy combined classification exports (for engine facade)
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
  aggregates: StudentAggregatesInput,
  policy?: StudentPolicyInput
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
  aggregates: StudentAggregatesInput,
  policy?: StudentPolicyInput
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
  aggregates: StudentAggregatesInput,
  policy?: StudentPolicyInput
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
