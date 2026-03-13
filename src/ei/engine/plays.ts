/**
 * Play definitions and selection logic.
 * 
 * 24 plays total (8 per protocol), each with trigger conditions and priority.
 * Source:
 * - EI_Protocol_1_Ignition.md lines 58-105 (P1 plays)
 * - EI_Protocol_2_Activation.md lines 57-107 (P2 plays)
 * - EI_Protocol_3_Verification.md lines 96-174 (P3 plays)
 */

import type { Mode } from './classify';
import type { StudentAggregates } from './classify';
import type { P1FailurePatterns, P2Escalation, P3Escalation, TightnessLevel } from './escalation';

// ============================================================================
// Play Definition Types
// ============================================================================

export type Protocol = 1 | 2 | 3;

export interface PlayContext {
  // Common context
  studentId: string;
  topicId?: string;
  aggregates: StudentAggregates;
  tightnessLevel: TightnessLevel;

  // P1-specific
  p1FailurePatterns?: P1FailurePatterns;
  currentEnergy?: number;
  highPressureDetected?: boolean;

  // P2-specific
  p2Escalation?: P2Escalation;
  replanCount?: number;
  startLatencyMin?: number;

  // P3-specific
  p3Escalation?: P3Escalation;
  hasRetrieval?: boolean;
  hasSchedule?: boolean;
  skipReason?: string;
  loopLatencyTrend?: 'improving' | 'worsening' | 'stable';
}

export interface PlayDefinition {
  id: string; // e.g., "P1-R1", "P2-N2", "P3-B3"
  protocol: Protocol;
  mode: Mode;
  name: string; // e.g., "Minimum Viable Win"
  description: string;
  trigger: (ctx: PlayContext) => boolean;
  priority: number; // higher = evaluated first when multiple plays match
}

// ============================================================================
// Protocol 1 Plays (8 total)
// ============================================================================

export const P1_PLAYS: PlayDefinition[] = [
  {
    id: 'P1-R1',
    protocol: 1,
    mode: 'Rescue',
    name: 'Minimum Viable Win (MVW)',
    description: 'LOW_ENERGY or high pressure; scope 10-30m, tier easy/med, minVerify 1-2Q',
    trigger: (ctx) => {
      // Triggers when low energy or high pressure detected
      return (
        (ctx.currentEnergy !== undefined && ctx.currentEnergy <= 2) ||
        ctx.highPressureDetected === true
      );
    },
    priority: 100,
  },
  {
    id: 'P1-R2',
    protocol: 1,
    mode: 'Rescue',
    name: 'Close One Open Loop',
    description:
      'OpenLoops >= 3 or rising; closeOpenLoop=true, enforce P3 min verify, constraint: "no new topic until 1 loop closed"',
    trigger: (ctx) => {
      // Triggers when open loops high or Pattern C detected
      return (
        ctx.aggregates.openLoops >= 3 ||
        ctx.p1FailurePatterns?.patternC === true
      );
    },
    priority: 110, // Higher priority than MVW
  },
  {
    id: 'P1-R3',
    protocol: 1,
    mode: 'Rescue',
    name: 'Anxiety-Safe Negotiation',
    description:
      'Anxiety/backlog high (revenge planning risk); reduce scope cap, tier med, calm rationale',
    trigger: (ctx) => {
      // Triggers when Pattern A detected (revenge planning)
      return ctx.p1FailurePatterns?.patternA === true;
    },
    priority: 105,
  },
  {
    id: 'P1-N1',
    protocol: 1,
    mode: 'Neutral',
    name: 'Margin Negotiation',
    description:
      'Neither Rescue nor Boost; keep BaselineIntent +/-10-20%, tier med, minVerify 1-3Q',
    trigger: (ctx) => {
      // Default Neutral play
      return true;
    },
    priority: 50,
  },
  {
    id: 'P1-N2',
    protocol: 1,
    mode: 'Neutral',
    name: 'Integrity-First Constraint',
    description:
      'State okay but verificationRate drifting or LoopLatency rising; tighten verification plan',
    trigger: (ctx) => {
      // Triggers when verification rate or loop latency declining
      return (
        ctx.aggregates.verificationRate7d < 0.70 ||
        ctx.loopLatencyTrend === 'worsening'
      );
    },
    priority: 60, // Higher priority than default Neutral
  },
  {
    id: 'P1-B1',
    protocol: 1,
    mode: 'Boost',
    name: 'Tier Boost',
    description:
      'HIGH_ENERGY + adherence strong + OpenLoops bounded; keep scope, raise difficultyTier',
    trigger: (ctx) => {
      // Triggers when high energy and strong adherence
      return (
        (ctx.currentEnergy !== undefined && ctx.currentEnergy >= 4) &&
        ctx.aggregates.openLoops <= 2 &&
        ctx.aggregates.verificationRate7d >= 0.75
      );
    },
    priority: 80,
  },
  {
    id: 'P1-B2',
    protocol: 1,
    mode: 'Boost',
    name: 'Challenge Density Boost',
    description:
      'Boost eligible; same timebox, harder problems/mixed set; guardrail: if Efficiency Delta poor -> quality boost',
    trigger: (ctx) => {
      // Triggers when efficiency is good (not declining)
      return ctx.loopLatencyTrend !== 'worsening';
    },
    priority: 70,
  },
  {
    id: 'P1-B3',
    protocol: 1,
    mode: 'Boost',
    name: 'Weak-Topic-First Boost',
    description:
      'Boost eligible + AvoidanceLatency rising on weak subject; re-route to weak topic with tight verification',
    trigger: (ctx) => {
      // This requires topic-specific avoidance detection
      // For now, use a simple heuristic (would need topic state analysis in practice)
      return ctx.aggregates.silenceDays >= 1; // Placeholder: some topics may be avoided
    },
    priority: 75,
  },
];

// ============================================================================
// Protocol 2 Plays (8 total)
// ============================================================================

export const P2_PLAYS: PlayDefinition[] = [
  {
    id: 'P2-R1',
    protocol: 2,
    mode: 'Rescue',
    name: 'Micro-Start',
    description: 'STALLED or repeated stalls; firstAction 30-120s, "solve Q1 only"',
    trigger: (ctx) => {
      // Triggers when escalation says default to micro-start or high start latency
      return (
        ctx.p2Escalation?.defaultToMicroStart === true ||
        (ctx.startLatencyMin !== undefined && ctx.startLatencyMin >= 15)
      );
    },
    priority: 110,
  },
  {
    id: 'P2-R2',
    protocol: 2,
    mode: 'Rescue',
    name: 'Two-Minute Rule',
    description:
      'Resisting start, anxiety high; timeboxMin=2, permission to stop after 2min',
    trigger: (ctx) => {
      // Triggers when high pressure detected and stalling
      return (
        ctx.highPressureDetected === true &&
        (ctx.replanCount !== undefined && ctx.replanCount >= 1)
      );
    },
    priority: 105,
  },
  {
    id: 'P2-R3',
    protocol: 2,
    mode: 'Rescue',
    name: 'Watch-Only (Guarded)',
    description:
      'STALLED AND low state; allow video/reading ONLY IF P3 will enforce VerifyNow(1-3Q) or ScheduleVerify(24h) -- cross-protocol constraint',
    trigger: (ctx) => {
      // Triggers when low energy, but NOT if watch-only is disallowed
      return (
        (ctx.currentEnergy !== undefined && ctx.currentEnergy <= 2) &&
        ctx.p2Escalation?.disallowWatchOnly !== true
      );
    },
    priority: 100,
  },
  {
    id: 'P2-N1',
    protocol: 2,
    mode: 'Neutral',
    name: 'Standard FirstAction',
    description:
      'Neither STALLED nor FLOWING; firstAction + light timebox 10-25min',
    trigger: (ctx) => {
      // Default Neutral play
      return true;
    },
    priority: 50,
  },
  {
    id: 'P2-N2',
    protocol: 2,
    mode: 'Neutral',
    name: 'Anti-Switch Cap',
    description:
      'Repeated switching/replanning detected; replanCap=2, force P2-R1 after cap',
    trigger: (ctx) => {
      // Triggers when replan escalation active
      return ctx.p2Escalation?.enforceReplanCap === true;
    },
    priority: 60,
  },
  {
    id: 'P2-B1',
    protocol: 2,
    mode: 'Boost',
    name: 'Isolation Contract',
    description:
      'FLOWING + adherence healthy; noSwitchingUntil=25-60, higher distraction block',
    trigger: (ctx) => {
      // Triggers when flowing and strong adherence
      return (
        (ctx.startLatencyMin !== undefined && ctx.startLatencyMin <= 3) &&
        ctx.aggregates.verificationRate7d >= 0.75
      );
    },
    priority: 80,
  },
  {
    id: 'P2-B2',
    protocol: 2,
    mode: 'Boost',
    name: 'Hard-First Start',
    description: 'Boost eligible; firstAction starts with hardest 1-3 items',
    trigger: (ctx) => {
      // Triggers when state is good (not declining)
      return ctx.aggregates.stateTrend7d !== 'worsening';
    },
    priority: 70,
  },
  {
    id: 'P2-B3',
    protocol: 2,
    mode: 'Boost',
    name: 'Continue-Last',
    description:
      'Boost eligible + active open thread; firstAction continues last meaningful task',
    trigger: (ctx) => {
      // Triggers when there are pending checks (open threads)
      return ctx.aggregates.pendingChecks >= 1;
    },
    priority: 75,
  },
];

// ============================================================================
// Protocol 3 Plays (8 total)
// ============================================================================

export const P3_PLAYS: PlayDefinition[] = [
  {
    id: 'R3-01',
    protocol: 3,
    mode: 'Rescue',
    name: 'One-Question Unlock',
    description:
      'AVOIDANT or no retrieval/schedule; VerifyNow, minQ=1, easy/med, timeboxSec=120-240',
    trigger: (ctx) => {
      // Triggers when no retrieval/schedule or escalation forces min proof
      return (
        (ctx.hasRetrieval === false && ctx.hasSchedule === false) ||
        ctx.p3Escalation?.forceMinProof === true
      );
    },
    priority: 110,
  },
  {
    id: 'R3-02',
    protocol: 3,
    mode: 'Rescue',
    name: 'Schedule with Hard Window',
    description:
      'LOW_ENERGY or time constraint; ScheduleVerify, dueInHours=24, gracePolicy: "missed -> OpenLoop + tighten"',
    trigger: (ctx) => {
      // Triggers when low energy AND scheduling not disallowed
      return (
        (ctx.currentEnergy !== undefined && ctx.currentEnergy <= 2) &&
        ctx.p3Escalation?.preferVerifyNow !== true
      );
    },
    priority: 105,
  },
  {
    id: 'R3-03',
    protocol: 3,
    mode: 'Rescue',
    name: 'Confusion Rescue',
    description:
      'Skip reason=confusion or repeated wrong answers; VerifyNow, minQ=1-3, tag "concept gap"',
    trigger: (ctx) => {
      // Triggers when skip reason is confusion
      return ctx.skipReason === 'confusion';
    },
    priority: 100,
  },
  {
    id: 'N3-01',
    protocol: 3,
    mode: 'Neutral',
    name: 'Minimum VerifyNow',
    description:
      'Neither AVOIDANT nor Boost; VerifyNow, minQ=1-3, med, timeboxSec=300-600',
    trigger: (ctx) => {
      // Default Neutral play
      return true;
    },
    priority: 50,
  },
  {
    id: 'N3-02',
    protocol: 3,
    mode: 'Neutral',
    name: 'Near-Term ScheduleVerify',
    description:
      'Clean session end, wants spacing; ScheduleVerify, dueInHours=24-48',
    trigger: (ctx) => {
      // Triggers when verification rate okay and scheduling not disallowed
      return (
        ctx.aggregates.verificationRate7d >= 0.65 &&
        ctx.p3Escalation?.preferVerifyNow !== true
      );
    },
    priority: 60,
  },
  {
    id: 'B3-01',
    protocol: 3,
    mode: 'Boost',
    name: 'Hard-Tier Set',
    description:
      'Boost eligible, state stable; VerifyNow, minQ=5+, hard/advanced, single_topic or mixed_set',
    trigger: (ctx) => {
      // Triggers when state stable and strong adherence
      return (
        ctx.aggregates.verificationRate7d >= 0.75 &&
        ctx.aggregates.stateTrend7d !== 'worsening'
      );
    },
    priority: 80,
  },
  {
    id: 'B3-02',
    protocol: 3,
    mode: 'Boost',
    name: 'Error-Log Requirement',
    description:
      'Boost eligible or gaming risk; VerifyNow, minQ=3-8, format=error_log, "wrong answers require 1-line why"',
    trigger: (ctx) => {
      // Triggers when skip count elevated (gaming risk)
      return ctx.aggregates.skipCount7d >= 1;
    },
    priority: 75,
  },
  {
    id: 'B3-03',
    protocol: 3,
    mode: 'Boost',
    name: 'Quality-Boost Override',
    description:
      'Efficiency Delta deteriorating or StateTrend declining; keep minQ low, change format to error_log/recall',
    trigger: (ctx) => {
      // Triggers when efficiency declining (quality over volume)
      return (
        ctx.loopLatencyTrend === 'worsening' ||
        ctx.aggregates.stateTrend7d === 'worsening'
      );
    },
    priority: 70,
  },
];

// ============================================================================
// Play Selection Logic
// ============================================================================

/**
 * Select the best matching play for a given protocol, mode, and context.
 * 
 * Algorithm:
 * 1. Filter plays by protocol and mode
 * 2. Evaluate each play's trigger predicate
 * 3. If multiple match, pick highest priority
 * 4. If none match, return the default play for that mode (lowest priority)
 * 
 * @returns The selected PlayDefinition
 */
export function selectPlay(
  protocol: Protocol,
  mode: Mode,
  context: PlayContext
): PlayDefinition {
  // Get plays for this protocol
  let plays: PlayDefinition[];
  if (protocol === 1) {
    plays = P1_PLAYS;
  } else if (protocol === 2) {
    plays = P2_PLAYS;
  } else {
    plays = P3_PLAYS;
  }

  // Filter by mode
  const modePlays = plays.filter((play) => play.mode === mode);

  // Evaluate triggers and find matching plays
  const matchingPlays = modePlays.filter((play) => {
    try {
      return play.trigger(context);
    } catch (error) {
      console.error(`Error evaluating trigger for play ${play.id}:`, error);
      return false;
    }
  });

  // If no plays match, return the default (lowest priority) play for this mode
  if (matchingPlays.length === 0) {
    const defaultPlay = modePlays.reduce((lowest, play) =>
      play.priority < lowest.priority ? play : lowest
    );
    return defaultPlay;
  }

  // If multiple plays match, return the highest priority one
  const selectedPlay = matchingPlays.reduce((highest, play) =>
    play.priority > highest.priority ? play : highest
  );

  return selectedPlay;
}

/**
 * Get all plays for a protocol.
 */
export function getPlaysForProtocol(protocol: Protocol): PlayDefinition[] {
  if (protocol === 1) return P1_PLAYS;
  if (protocol === 2) return P2_PLAYS;
  return P3_PLAYS;
}

/**
 * Get a play by ID.
 */
export function getPlayById(playId: string): PlayDefinition | undefined {
  const allPlays = [...P1_PLAYS, ...P2_PLAYS, ...P3_PLAYS];
  return allPlays.find((play) => play.id === playId);
}
