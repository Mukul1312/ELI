/**
 * Gate context types for P1/P2/P3 classification.
 * Per tactical/loop-health-assessment-tactical-spec.md.
 */

export type SleepBucket = '<6' | '6-7' | '7-8' | '>=8';

export interface P1Context {
  energy: number; // 1-5
  sleepBucket: SleepBucket;
  highPressureDetected: boolean; // System-derived; defaults false (V3 triggers, Stage 2)
}

export interface P2Context {
  startLatencyMin?: number;
  replanCount: number;
  hasStartSignal: boolean;
  timeSinceIntentSet: number;
}

export interface P3Context {
  hasRetrieval: boolean;
  hasSchedule: boolean;
}

export type GateContext = P1Context | P2Context | P3Context;
