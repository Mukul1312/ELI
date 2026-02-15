/**
 * Play executor: assemble typed output contracts from play definitions + context.
 * 
 * Implements EI_Engine_Taxonomy.md section 5 (output contracts).
 * 
 * This module takes a selected PlayDefinition and context, then produces the fully
 * typed output contract with all fields populated from:
 * - Play template
 * - Context (topic, stateScore, aggregates)
 * - Policy dials (from Strategic Adjustment)
 * - Tightness adjustments
 * - Cross-protocol constraints
 */

import type { PlayDefinition, PlayContext } from './plays';
import type { TightnessLevel } from './escalation';
import type { StudentPolicy } from './classify';
import type { DifficultyTier } from './score';

import {
  P1_RESCUE_SCOPE_MIN,
  P1_RESCUE_SCOPE_MAX,
  P1_NEUTRAL_SCOPE_MIN,
  P1_NEUTRAL_SCOPE_MAX,
  P1_BOOST_SCOPE_MIN,
  P1_BOOST_SCOPE_MAX,
  P1_RESCUE_MIN_QUESTIONS,
  P1_NEUTRAL_MIN_QUESTIONS_MIN,
  P1_NEUTRAL_MIN_QUESTIONS_MAX,
  P1_BOOST_MIN_QUESTIONS,
  P2_RESCUE_TIMEBOX_MIN,
  P2_RESCUE_TIMEBOX_MAX,
  P2_NEUTRAL_TIMEBOX_MIN,
  P2_NEUTRAL_TIMEBOX_MAX,
  P2_BOOST_TIMEBOX_MIN,
  P2_BOOST_TIMEBOX_MAX,
  P2_REPLAN_CAP_DEFAULT,
  P2_MICRO_START_MIN_SEC,
  P2_MICRO_START_MAX_SEC,
  P2_TWO_MINUTE_RULE_MIN,
  P3_RESCUE_MIN_QUESTIONS,
  P3_NEUTRAL_MIN_QUESTIONS_MIN,
  P3_NEUTRAL_MIN_QUESTIONS_MAX,
  P3_BOOST_MIN_QUESTIONS,
  P3_RESCUE_TIMEBOX_MIN_SEC,
  P3_RESCUE_TIMEBOX_MAX_SEC,
  P3_NEUTRAL_TIMEBOX_MIN_SEC,
  P3_NEUTRAL_TIMEBOX_MAX_SEC,
  P3_BOOST_TIMEBOX_MIN_SEC,
  P3_BOOST_TIMEBOX_MAX_SEC,
  DEFAULT_TARGET_LATENCY_HOURS,
  SCHEDULE_GRACE_HOURS,
} from './tunables';

// ============================================================================
// Output Contract Types
// ============================================================================

export interface NegotiatedIntentIssued {
  studentId: string;
  topicId: string;
  playId: string;
  scope: {
    timeboxMin: number; // minutes
    questionCount: number;
    difficultyTier: DifficultyTier;
  };
  verificationPlan: {
    minQuestions: number;
    preferVerifyNow: boolean; // vs ScheduleVerify
  };
  constraints?: {
    closeOpenLoopFirst?: boolean;
    noNewTopicUntil?: string;
  };
  stateScore: number;
  intentScore?: number;
  ambitionDelta?: number;
  rationale?: string; // Optional: filled by Agent later
}

export interface ActivationPlanIssued {
  studentId: string;
  topicId: string;
  playId: string;
  firstAction: {
    type: 'solve_q1' | 'watch_only' | 'standard' | 'hard_first' | 'continue_last';
    timeboxMin?: number; // for standard/micro-start
    timeboxSec?: number; // for micro-start
    description?: string;
  };
  replanCap?: number;
  constraints?: {
    noSwitchingUntil?: number; // minutes
    enforceWatchOnlyVerification?: boolean; // P2-R3 cross-protocol flag
  };
  rationale?: string;
}

export type VerificationDecision = 'VerifyNow' | 'ScheduleVerify' | 'Skip';

export interface VerificationDecisionIssued {
  studentId: string;
  topicId: string;
  playId: string;
  decision: VerificationDecision;
  verifyNow?: {
    minQuestions: number;
    timeboxSec: number;
    difficultyTier: DifficultyTier;
    format?: 'standard' | 'error_log' | 'recall' | 'mixed_set';
  };
  scheduleVerify?: {
    dueInHours: number;
    graceHours: number;
    minQuestions: number;
  };
  skipReason?: string;
  rationale?: string;
}

// ============================================================================
// Execute Play: Protocol 1
// ============================================================================

export function executeP1Play(
  play: PlayDefinition,
  context: PlayContext,
  policy?: StudentPolicy,
  stateScore?: number,
  intentScore?: number,
  ambitionDelta?: number
): NegotiatedIntentIssued {
  // Determine scope based on play mode and policy multipliers
  let scopeMin: number;
  let scopeMax: number;

  if (play.mode === 'Rescue') {
    scopeMin = P1_RESCUE_SCOPE_MIN;
    scopeMax = P1_RESCUE_SCOPE_MAX;
  } else if (play.mode === 'Boost') {
    scopeMin = P1_BOOST_SCOPE_MIN;
    scopeMax = P1_BOOST_SCOPE_MAX;
  } else {
    scopeMin = P1_NEUTRAL_SCOPE_MIN;
    scopeMax = P1_NEUTRAL_SCOPE_MAX;
  }

  // Apply policy scope multiplier
  if (policy?.scopeMultiplier) {
    scopeMin = Math.round(scopeMin * policy.scopeMultiplier);
    scopeMax = Math.round(scopeMax * policy.scopeMultiplier);
  }

  // Pick midpoint of range
  const timeboxMin = Math.round((scopeMin + scopeMax) / 2);

  // Determine question count (rough heuristic: 1Q per 15 min)
  const questionCount = Math.max(1, Math.round(timeboxMin / 15));

  // Determine difficulty tier
  let difficultyTier: DifficultyTier = 'med';
  if (play.mode === 'Rescue' || play.id === 'P1-R3') {
    difficultyTier = 'easy';
  } else if (play.id === 'P1-B1' || play.id === 'P1-B2') {
    // Tier boost or challenge density boost
    difficultyTier = 'hard';
  }

  // Apply policy difficulty delta
  if (policy?.difficultyTierDelta) {
    const tiers: DifficultyTier[] = ['easy', 'med', 'hard', 'advanced'];
    const currentIndex = tiers.indexOf(difficultyTier);
    const newIndex = Math.max(
      0,
      Math.min(3, currentIndex + policy.difficultyTierDelta)
    );
    difficultyTier = tiers[newIndex];
  }

  // Verification plan
  let minQuestions: number;
  if (play.mode === 'Rescue') {
    minQuestions = P1_RESCUE_MIN_QUESTIONS;
  } else if (play.mode === 'Boost') {
    minQuestions = P1_BOOST_MIN_QUESTIONS;
  } else {
    minQuestions = Math.round(
      (P1_NEUTRAL_MIN_QUESTIONS_MIN + P1_NEUTRAL_MIN_QUESTIONS_MAX) / 2
    );
  }

  // Tightness adjustment: Tight -> prefer VerifyNow, Loose -> allow ScheduleVerify
  const preferVerifyNow = context.tightnessLevel === 'Tight' || play.id === 'P1-N2';

  // Constraints
  const constraints: NegotiatedIntentIssued['constraints'] = {};
  if (play.id === 'P1-R2') {
    // Close one open loop
    constraints.closeOpenLoopFirst = true;
    constraints.noNewTopicUntil = '1LoopClosed';
  }
  if (policy?.constraints?.closeLoopsFirst) {
    constraints.closeOpenLoopFirst = true;
  }

  return {
    studentId: context.studentId,
    topicId: context.topicId || 'default-topic',
    playId: play.id,
    scope: {
      timeboxMin,
      questionCount,
      difficultyTier,
    },
    verificationPlan: {
      minQuestions,
      preferVerifyNow,
    },
    constraints: Object.keys(constraints).length > 0 ? constraints : undefined,
    stateScore: stateScore || 5,
    intentScore,
    ambitionDelta,
  };
}

// ============================================================================
// Execute Play: Protocol 2
// ============================================================================

export function executeP2Play(
  play: PlayDefinition,
  context: PlayContext,
  policy?: StudentPolicy
): ActivationPlanIssued {
  const output: ActivationPlanIssued = {
    studentId: context.studentId,
    topicId: context.topicId || 'default-topic',
    playId: play.id,
    firstAction: {
      type: 'standard',
    },
  };

  // Determine firstAction based on play
  if (play.id === 'P2-R1') {
    // Micro-start
    output.firstAction = {
      type: 'solve_q1',
      timeboxSec: P2_MICRO_START_MAX_SEC,
      description: 'Solve Q1 only, then decide',
    };
  } else if (play.id === 'P2-R2') {
    // Two-minute rule
    output.firstAction = {
      type: 'standard',
      timeboxMin: P2_TWO_MINUTE_RULE_MIN,
      description: 'Try for 2 minutes, permission to stop',
    };
  } else if (play.id === 'P2-R3') {
    // Watch-only (guarded)
    output.firstAction = {
      type: 'watch_only',
      description: 'Watch/read only, minimum verification required at SessionEnd',
    };
    // Set cross-protocol constraint flag
    output.constraints = {
      enforceWatchOnlyVerification: true,
    };
  } else if (play.id === 'P2-B1') {
    // Isolation contract
    let timeboxMin: number;
    if (play.mode === 'Boost') {
      timeboxMin = Math.round((P2_BOOST_TIMEBOX_MIN + P2_BOOST_TIMEBOX_MAX) / 2);
    } else {
      timeboxMin = Math.round((P2_NEUTRAL_TIMEBOX_MIN + P2_NEUTRAL_TIMEBOX_MAX) / 2);
    }
    output.firstAction = {
      type: 'standard',
      timeboxMin,
      description: 'No switching until timebox complete',
    };
    output.constraints = {
      noSwitchingUntil: timeboxMin,
    };
  } else if (play.id === 'P2-B2') {
    // Hard-first start
    output.firstAction = {
      type: 'hard_first',
      description: 'Start with hardest 1-3 items',
    };
  } else if (play.id === 'P2-B3') {
    // Continue-last
    output.firstAction = {
      type: 'continue_last',
      description: 'Continue last meaningful task',
    };
  } else {
    // Default standard firstAction
    let timeboxMin: number;
    if (play.mode === 'Rescue') {
      timeboxMin = Math.round((P2_RESCUE_TIMEBOX_MIN + P2_RESCUE_TIMEBOX_MAX) / 2);
    } else if (play.mode === 'Boost') {
      timeboxMin = Math.round((P2_BOOST_TIMEBOX_MIN + P2_BOOST_TIMEBOX_MAX) / 2);
    } else {
      timeboxMin = Math.round((P2_NEUTRAL_TIMEBOX_MIN + P2_NEUTRAL_TIMEBOX_MAX) / 2);
    }
    output.firstAction = {
      type: 'standard',
      timeboxMin,
    };
  }

  // Replan cap
  if (play.id === 'P2-N2' || context.p2Escalation?.enforceReplanCap) {
    output.replanCap = P2_REPLAN_CAP_DEFAULT;
  }

  return output;
}

// ============================================================================
// Execute Play: Protocol 3
// ============================================================================

export function executeP3Play(
  play: PlayDefinition,
  context: PlayContext,
  policy?: StudentPolicy,
  p1VerificationPlan?: { minQuestions: number; preferVerifyNow: boolean },
  p2WatchOnlyFlag?: boolean
): VerificationDecisionIssued {
  const output: VerificationDecisionIssued = {
    studentId: context.studentId,
    topicId: context.topicId || 'default-topic',
    playId: play.id,
    decision: 'VerifyNow', // default
  };

  // Determine decision based on play
  if (play.id === 'R3-01' || play.id === 'R3-03') {
    // One-Question Unlock or Confusion Rescue
    output.decision = 'VerifyNow';
    output.verifyNow = {
      minQuestions: P3_RESCUE_MIN_QUESTIONS,
      timeboxSec: Math.round(
        (P3_RESCUE_TIMEBOX_MIN_SEC + P3_RESCUE_TIMEBOX_MAX_SEC) / 2
      ),
      difficultyTier: 'easy',
    };
  } else if (play.id === 'R3-02') {
    // Schedule with hard window
    output.decision = 'ScheduleVerify';
    output.scheduleVerify = {
      dueInHours: 24,
      graceHours: SCHEDULE_GRACE_HOURS,
      minQuestions: P3_RESCUE_MIN_QUESTIONS,
    };
  } else if (play.id === 'N3-01') {
    // Minimum VerifyNow
    output.decision = 'VerifyNow';
    output.verifyNow = {
      minQuestions: Math.round(
        (P3_NEUTRAL_MIN_QUESTIONS_MIN + P3_NEUTRAL_MIN_QUESTIONS_MAX) / 2
      ),
      timeboxSec: Math.round(
        (P3_NEUTRAL_TIMEBOX_MIN_SEC + P3_NEUTRAL_TIMEBOX_MAX_SEC) / 2
      ),
      difficultyTier: 'med',
    };
  } else if (play.id === 'N3-02') {
    // Near-term ScheduleVerify
    output.decision = 'ScheduleVerify';
    output.scheduleVerify = {
      dueInHours: DEFAULT_TARGET_LATENCY_HOURS,
      graceHours: SCHEDULE_GRACE_HOURS,
      minQuestions: Math.round(
        (P3_NEUTRAL_MIN_QUESTIONS_MIN + P3_NEUTRAL_MIN_QUESTIONS_MAX) / 2
      ),
    };
  } else if (play.id === 'B3-01') {
    // Hard-tier set
    output.decision = 'VerifyNow';
    output.verifyNow = {
      minQuestions: P3_BOOST_MIN_QUESTIONS,
      timeboxSec: Math.round(
        (P3_BOOST_TIMEBOX_MIN_SEC + P3_BOOST_TIMEBOX_MAX_SEC) / 2
      ),
      difficultyTier: 'hard',
      format: 'mixed_set',
    };
  } else if (play.id === 'B3-02') {
    // Error-log requirement
    output.decision = 'VerifyNow';
    output.verifyNow = {
      minQuestions: Math.round((3 + 8) / 2),
      timeboxSec: Math.round(
        (P3_BOOST_TIMEBOX_MIN_SEC + P3_BOOST_TIMEBOX_MAX_SEC) / 2
      ),
      difficultyTier: 'med',
      format: 'error_log',
    };
  } else if (play.id === 'B3-03') {
    // Quality-boost override
    output.decision = 'VerifyNow';
    output.verifyNow = {
      minQuestions: Math.round(
        (P3_NEUTRAL_MIN_QUESTIONS_MIN + P3_NEUTRAL_MIN_QUESTIONS_MAX) / 2
      ),
      timeboxSec: Math.round(
        (P3_NEUTRAL_TIMEBOX_MIN_SEC + P3_NEUTRAL_TIMEBOX_MAX_SEC) / 2
      ),
      difficultyTier: 'med',
      format: 'recall',
    };
  }

  // Apply cross-protocol constraints

  // 1. P1 verificationPlan floor
  if (
    p1VerificationPlan &&
    output.verifyNow &&
    output.verifyNow.minQuestions < p1VerificationPlan.minQuestions
  ) {
    output.verifyNow.minQuestions = p1VerificationPlan.minQuestions;
  }

  // 2. P2 watch-only flag: MUST enforce minimum verification
  if (p2WatchOnlyFlag) {
    if (output.decision === 'Skip') {
      // Override Skip to VerifyNow
      output.decision = 'VerifyNow';
      output.verifyNow = {
        minQuestions: 1,
        timeboxSec: P3_RESCUE_TIMEBOX_MAX_SEC,
        difficultyTier: 'easy',
      };
    } else if (output.decision === 'ScheduleVerify') {
      // Schedule with 24h hard window
      output.scheduleVerify = {
        dueInHours: 24,
        graceHours: SCHEDULE_GRACE_HOURS,
        minQuestions: 1,
      };
    }
  }

  // 3. P3 escalation: prefer VerifyNow over scheduling
  if (
    context.p3Escalation?.preferVerifyNow &&
    output.decision === 'ScheduleVerify'
  ) {
    output.decision = 'VerifyNow';
    output.verifyNow = {
      minQuestions: output.scheduleVerify?.minQuestions || 1,
      timeboxSec: P3_NEUTRAL_TIMEBOX_MAX_SEC,
      difficultyTier: 'med',
    };
    delete output.scheduleVerify;
  }

  // 4. Tightness adjustment
  if (context.tightnessLevel === 'Tight' && output.decision === 'ScheduleVerify') {
    // Tighten: reduce dueInHours
    if (output.scheduleVerify) {
      output.scheduleVerify.dueInHours = Math.max(
        24,
        Math.round(output.scheduleVerify.dueInHours * 0.75)
      );
    }
  }

  return output;
}

// ============================================================================
// Main Execute Play Function
// ============================================================================

export type ProtocolOutput =
  | NegotiatedIntentIssued
  | ActivationPlanIssued
  | VerificationDecisionIssued;

export function executePlay(
  play: PlayDefinition,
  context: PlayContext,
  policy?: StudentPolicy,
  stateScore?: number,
  intentScore?: number,
  ambitionDelta?: number,
  p1VerificationPlan?: { minQuestions: number; preferVerifyNow: boolean },
  p2WatchOnlyFlag?: boolean
): ProtocolOutput {
  if (play.protocol === 1) {
    return executeP1Play(play, context, policy, stateScore, intentScore, ambitionDelta);
  } else if (play.protocol === 2) {
    return executeP2Play(play, context, policy);
  } else {
    return executeP3Play(play, context, policy, p1VerificationPlan, p2WatchOnlyFlag);
  }
}
