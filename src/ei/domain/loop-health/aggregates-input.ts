/**
 * Input DTOs for AssessLoopHealth.
 * Flat shapes matching classify input; maps from DB/Projections.
 */

import type { StateTrend } from './loop-health-snapshot';

export interface StudentAggregatesInput {
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

export interface StudentPolicyInput {
  tightnessLevel?: 'Loose' | 'Normal' | 'Tight';
  scopeMultiplier?: number;
  difficultyTierDelta?: number;
  constraints?: {
    closeLoopsFirst?: boolean;
    noNewTopicUntil?: string;
  };
}
