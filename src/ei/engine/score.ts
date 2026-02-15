/**
 * Scoring functions for State and Intent assessment.
 * 
 * Implements the appendix from EI_Protocol_1_Ignition.md lines 215-258.
 * These are pure functions used by Protocol 1 for Ambition Delta computation
 * and by Strategic Adjustment for trend analysis.
 */

import {
  STATE_SCORE_BASE,
  ENERGY_WEIGHTS,
  SLEEP_UNDER_6_ADJUSTMENT,
  SLEEP_6_TO_7_ADJUSTMENT,
  SLEEP_7_TO_8_ADJUSTMENT,
  SLEEP_8_PLUS_ADJUSTMENT,
  PRESSURE_WEIGHTS,
  BACKLOG_PRESSURE_WEIGHTS,
  INTENT_TIMEBOX_10_30_SCORE,
  INTENT_TIMEBOX_31_60_SCORE,
  INTENT_TIMEBOX_61_90_SCORE,
  INTENT_TIMEBOX_90_PLUS_SCORE,
  INTENT_QUESTIONS_1_3_SCORE,
  INTENT_QUESTIONS_4_10_SCORE,
  INTENT_QUESTIONS_11_20_SCORE,
  INTENT_QUESTIONS_20_PLUS_SCORE,
  DIFFICULTY_EASY_ADDON,
  DIFFICULTY_MED_ADDON,
  DIFFICULTY_HARD_ADDON,
  DIFFICULTY_ADVANCED_ADDON,
  AMBITION_DELTA_OVERREACH,
  AMBITION_DELTA_SANDBAGGING,
} from './tunables';

export type SleepBucket = '<6' | '6-7' | '7-8' | '>=8';
export type DifficultyTier = 'easy' | 'med' | 'hard' | 'advanced';

export interface AppOpenContext {
  energy: number; // 1-5
  sleepBucket: SleepBucket;
  pressure: number; // 1-5
  backlogPressure: number; // 1-5
}

export interface IntentScope {
  timeboxMin: number; // minutes
  questionCount: number;
  difficultyTier: DifficultyTier;
}

/**
 * Compute StateScore (1-10) from AppOpen context.
 * 
 * Algorithm:
 * 1. Start from base score of 5
 * 2. Add energy adjustment: [-2, -1, 0, +1, +2] for energy [1, 2, 3, 4, 5]
 * 3. Add sleep adjustment: <6h:-2, 6-7h:-1, 7-8h:0, >=8h:+1
 * 4. Add pressure adjustment: [+1, 0, -1, -2, -3] for pressure [1, 2, 3, 4, 5]
 * 5. Add backlog pressure adjustment: [+1, 0, -1, -2, -3] for backlogPressure [1, 2, 3, 4, 5]
 * 6. Clamp to [1..10]
 * 
 * @returns StateScore in range [1..10]
 */
export function computeStateScore(context: AppOpenContext): number {
  let score = STATE_SCORE_BASE;

  // Energy adjustment (1-5 scale)
  if (context.energy >= 1 && context.energy <= 5) {
    score += ENERGY_WEIGHTS[context.energy - 1];
  }

  // Sleep adjustment
  switch (context.sleepBucket) {
    case '<6':
      score += SLEEP_UNDER_6_ADJUSTMENT;
      break;
    case '6-7':
      score += SLEEP_6_TO_7_ADJUSTMENT;
      break;
    case '7-8':
      score += SLEEP_7_TO_8_ADJUSTMENT;
      break;
    case '>=8':
      score += SLEEP_8_PLUS_ADJUSTMENT;
      break;
  }

  // Pressure adjustment (1-5 scale, inverted: low pressure is good)
  if (context.pressure >= 1 && context.pressure <= 5) {
    score += PRESSURE_WEIGHTS[context.pressure - 1];
  }

  // Backlog pressure adjustment (1-5 scale, inverted: low backlog is good)
  if (context.backlogPressure >= 1 && context.backlogPressure <= 5) {
    score += BACKLOG_PRESSURE_WEIGHTS[context.backlogPressure - 1];
  }

  // Clamp to [1..10]
  return Math.max(1, Math.min(10, score));
}

/**
 * Compute IntentScore (1-10) from intent scope.
 * 
 * Algorithm:
 * 1. Compute timebox score:
 *    - 10-30m -> 3
 *    - 31-60m -> 5
 *    - 61-90m -> 7
 *    - >90m -> 9
 * 2. Compute question count score:
 *    - 1-3Q -> 3
 *    - 4-10Q -> 5
 *    - 11-20Q -> 7
 *    - >20Q -> 9
 * 3. Take max of timebox and question count scores
 * 4. Add difficulty tier add-on: easy:0, med:+1, hard:+2, advanced:+3
 * 5. Clamp to [1..10]
 * 
 * @returns IntentScore in range [1..10]
 */
export function computeIntentScore(scope: IntentScope): number {
  // Timebox score
  let timeboxScore: number;
  if (scope.timeboxMin <= 30) {
    timeboxScore = INTENT_TIMEBOX_10_30_SCORE;
  } else if (scope.timeboxMin <= 60) {
    timeboxScore = INTENT_TIMEBOX_31_60_SCORE;
  } else if (scope.timeboxMin <= 90) {
    timeboxScore = INTENT_TIMEBOX_61_90_SCORE;
  } else {
    timeboxScore = INTENT_TIMEBOX_90_PLUS_SCORE;
  }

  // Question count score
  let questionScore: number;
  if (scope.questionCount <= 3) {
    questionScore = INTENT_QUESTIONS_1_3_SCORE;
  } else if (scope.questionCount <= 10) {
    questionScore = INTENT_QUESTIONS_4_10_SCORE;
  } else if (scope.questionCount <= 20) {
    questionScore = INTENT_QUESTIONS_11_20_SCORE;
  } else {
    questionScore = INTENT_QUESTIONS_20_PLUS_SCORE;
  }

  // Base score is max of timebox and question count
  let score = Math.max(timeboxScore, questionScore);

  // Add difficulty tier add-on
  switch (scope.difficultyTier) {
    case 'easy':
      score += DIFFICULTY_EASY_ADDON;
      break;
    case 'med':
      score += DIFFICULTY_MED_ADDON;
      break;
    case 'hard':
      score += DIFFICULTY_HARD_ADDON;
      break;
    case 'advanced':
      score += DIFFICULTY_ADVANCED_ADDON;
      break;
  }

  // Clamp to [1..10]
  return Math.max(1, Math.min(10, score));
}

/**
 * Compute Ambition Delta from intent and state scores.
 * 
 * DeltaA = IntentScore - StateScore
 * 
 * Interpretation:
 * - DeltaA >= +3: Overreach (planning too ambitiously for current state)
 * - DeltaA <= -3: Sandbagging (planning too conservatively)
 * - -2 <= DeltaA <= +2: Appropriate ambition
 * 
 * @returns Ambition Delta (typically in range [-9..+9], but most commonly [-5..+5])
 */
export function computeAmbitionDelta(intentScore: number, stateScore: number): number {
  return intentScore - stateScore;
}

/**
 * Classify Ambition Delta into overreach/sandbagging/appropriate.
 */
export type AmbitionClassification = 'overreach' | 'sandbagging' | 'appropriate';

export function classifyAmbitionDelta(delta: number): AmbitionClassification {
  if (delta >= AMBITION_DELTA_OVERREACH) {
    return 'overreach';
  } else if (delta <= AMBITION_DELTA_SANDBAGGING) {
    return 'sandbagging';
  } else {
    return 'appropriate';
  }
}

/**
 * Compute Ambition Delta from raw context and scope (convenience function).
 */
export function computeAmbitionDeltaFromContext(
  appOpenContext: AppOpenContext,
  intentScope: IntentScope
): {
  stateScore: number;
  intentScore: number;
  ambitionDelta: number;
  classification: AmbitionClassification;
} {
  const stateScore = computeStateScore(appOpenContext);
  const intentScore = computeIntentScore(intentScope);
  const ambitionDelta = computeAmbitionDelta(intentScore, stateScore);
  const classification = classifyAmbitionDelta(ambitionDelta);

  return {
    stateScore,
    intentScore,
    ambitionDelta,
    classification,
  };
}
