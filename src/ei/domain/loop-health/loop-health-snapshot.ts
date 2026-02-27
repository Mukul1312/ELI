/**
 * LoopHealthSnapshot and LoopHealthEvidence types.
 * Output contract for LHA; consumed by Runtime, SA, Radar.
 * Per tactical/loop-health-assessment-tactical-spec.md, docs/engineering-ddd-design/05-cross-cutting-concerns.md.
 */

export type P1Label = 'LOW_ENERGY' | 'HIGH_ENERGY' | 'NEUTRAL';
export type P2Label = 'STALLED' | 'FLOWING' | 'NEUTRAL';
export type P3Label = 'AVOIDANT' | 'CONFIDENT' | 'NEUTRAL';
export type Mode = 'Rescue' | 'Neutral' | 'Boost';
export type StateTrend = 'improving' | 'flat' | 'worsening';

export interface LoopHealthEvidence {
  openLoops: number;
  verificationRate7d: number;
  silenceDays: number;
  scheduleMisses7d: number;
  startLatencyMin?: number;
  stateTrend7d: StateTrend;
  loopLatencyTrend?: 'improving' | 'worsening' | 'stable';
}

export interface LoopHealthSnapshot {
  studentId: string;
  p1: P1Label;
  p2: P2Label;
  p3: P3Label;
  mode: Mode;
  evidence: LoopHealthEvidence;
  computedAt: string; // ISO8601
}
