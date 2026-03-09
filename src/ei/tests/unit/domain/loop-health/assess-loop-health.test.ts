import { describe, it, expect } from 'vitest';
import {
  assessLoopHealth,
  assignP1Label,
  assignP2Label,
  assignP3Label,
  resolveMode,
} from '../../../../domain/loop-health/assess-loop-health';
import type { StudentAggregatesInput } from '../../../../domain/loop-health/aggregates-input';
import type { P1Context, P2Context, P3Context } from '../../../../domain/loop-health/gate-context';

function baseAggregates(overrides: Partial<StudentAggregatesInput> = {}): StudentAggregatesInput {
  return {
    pendingChecks: 0,
    openLoops: 0,
    verificationRate7d: 1.0,
    scheduleMisses7d: 0,
    avoidantExits7d: 0,
    skipCount7d: 0,
    silenceDays: 0,
    replanLoopCount7d: 0,
    stateTrend7d: 'flat',
    ...overrides,
  };
}

describe('assessLoopHealth domain', () => {
  const computedAt = '2025-01-01T12:00:00Z';

  describe('Gate-phase-primary mode resolution', () => {
    it('P1: new user HIGH_ENERGY → Boost (reported bug fix)', () => {
      const p1Context: P1Context = { energy: 4, sleepBucket: '7-8', highPressureDetected: false };
      const aggregates = baseAggregates({ openLoops: 0, verificationRate7d: 1.0, silenceDays: 0, scheduleMisses7d: 0 });
      const snapshot = assessLoopHealth('new-user', aggregates, p1Context, undefined, 'P1', computedAt);
      expect(snapshot.p1).toBe('HIGH_ENERGY');
      expect(snapshot.mode).toBe('Boost');
    });

    it('P2: FLOWING at P2 gate → not overridden by P1/P3 defaults', () => {
      const p2Context: P2Context = {
        startLatencyMin: 2,
        replanCount: 0,
        hasStartSignal: true,
        timeSinceIntentSet: 2,
      };
      const aggregates = baseAggregates({ verificationRate7d: 0.85, openLoops: 0, scheduleMisses7d: 0 });
      const snapshot = assessLoopHealth('p2-flow', aggregates, p2Context, undefined, 'P2', computedAt);
      expect(snapshot.p2).toBe('FLOWING');
      expect(snapshot.mode).toBe('Boost');
    });

    it('P3: AVOIDANT at actual P3 gate → still Rescue', () => {
      const p3Context: P3Context = { hasRetrieval: false, hasSchedule: false };
      const aggregates = baseAggregates({ openLoops: 3 });
      const snapshot = assessLoopHealth('p3-avoid', aggregates, p3Context, undefined, 'P3', computedAt);
      expect(snapshot.p3).toBe('AVOIDANT');
      expect(snapshot.mode).toBe('Rescue');
    });

    it('undefined gatePhase: all labels contribute (background path)', () => {
      const p3Context: P3Context = { hasRetrieval: false, hasSchedule: false };
      const aggregates = baseAggregates({ openLoops: 2, verificationRate7d: 0.7 });
      const snapshot = assessLoopHealth('bg', aggregates, p3Context, undefined, undefined, computedAt);
      expect(snapshot.p3).toBe('AVOIDANT');
      expect(snapshot.mode).toBe('Rescue');
    });
  });

  describe('S2 lowCapacity', () => {
    it('returns P1 LOW_ENERGY when pressure high', () => {
      const p1Context: P1Context = { energy: 4, sleepBucket: '6-7', highPressureDetected: true };
      const aggregates = baseAggregates({ openLoops: 1, verificationRate7d: 0.8 });
      const snapshot = assessLoopHealth('s2', aggregates, p1Context, undefined, 'P1', computedAt);
      expect(snapshot.p1).toBe('LOW_ENERGY');
      expect(['Rescue', 'Neutral']).toContain(snapshot.mode);
    });
  });

  describe('S5 lowEnergy', () => {
    it('returns P1 LOW_ENERGY and mode Rescue when energy low and stateTrend worsening', () => {
      const p1Context: P1Context = { energy: 2, sleepBucket: '<6', highPressureDetected: true };
      const aggregates = baseAggregates({ silenceDays: 3, stateTrend7d: 'worsening', verificationRate7d: 0.5 });
      const snapshot = assessLoopHealth('s5', aggregates, p1Context, undefined, 'P1', computedAt);
      expect(snapshot.p1).toBe('LOW_ENERGY');
      expect(snapshot.mode).toBe('Rescue');
    });
  });

  describe('S7 avoidantRisk', () => {
    it('returns P3 AVOIDANT and mode Rescue when no retrieval/schedule and openLoops high', () => {
      const p3Context: P3Context = { hasRetrieval: false, hasSchedule: false };
      const aggregates = baseAggregates({ openLoops: 4, verificationRate7d: 0.5, silenceDays: 2 });
      const snapshot = assessLoopHealth('s7', aggregates, p3Context, undefined, 'P3', computedAt);
      expect(snapshot.p3).toBe('AVOIDANT');
      expect(snapshot.mode).toBe('Rescue');
    });
  });

  describe('Precedence: risk overrides ambition', () => {
    it('resolveMode returns Neutral when HIGH_ENERGY label but openLoops >= 3 (risk signals)', () => {
      const aggregates = baseAggregates({ openLoops: 3, silenceDays: 0, verificationRate7d: 0.8 });
      const mode = resolveMode('HIGH_ENERGY', aggregates, undefined);
      expect(mode).toBe('Neutral');
      expect(mode).not.toBe('Boost');
    });
  });

  describe('Precedence: AVOIDANT -> Rescue', () => {
    it('returns Rescue when P3 AVOIDANT', () => {
      const p3Context: P3Context = { hasRetrieval: false, hasSchedule: false };
      const aggregates = baseAggregates({ openLoops: 3 });
      const label = assignP3Label(p3Context, aggregates);
      expect(label).toBe('AVOIDANT');
      expect(resolveMode(label, aggregates, undefined)).toBe('Rescue');
    });
  });

  describe('Precedence: STALLED -> Rescue', () => {
    it('returns Rescue when P2 STALLED', () => {
      const p2Context: P2Context = { startLatencyMin: 20, replanCount: 0, hasStartSignal: false, timeSinceIntentSet: 25 };
      const aggregates = baseAggregates({ verificationRate7d: 0.8 });
      const label = assignP2Label(p2Context, aggregates);
      expect(label).toBe('STALLED');
      expect(resolveMode(label, aggregates, undefined)).toBe('Rescue');
    });
  });

  describe('Determinism', () => {
    it('returns identical snapshot for same inputs', () => {
      const p1Context: P1Context = { energy: 3, sleepBucket: '7-8', highPressureDetected: false };
      const aggregates = baseAggregates({ openLoops: 1, verificationRate7d: 0.85 });
      const a = assessLoopHealth('d1', aggregates, p1Context, undefined, 'P1', computedAt);
      const b = assessLoopHealth('d1', aggregates, p1Context, undefined, 'P1', computedAt);
      expect(a).toEqual(b);
    });
  });

  describe('Privacy', () => {
    it('evidence has no raw events', () => {
      const snapshot = assessLoopHealth(
        's1',
        baseAggregates(),
        { energy: 3, sleepBucket: '7-8', highPressureDetected: false },
        undefined,
        'P1',
        computedAt
      );
      expect(snapshot.evidence).toHaveProperty('openLoops');
      expect(snapshot.evidence).not.toHaveProperty('events');
    });
  });

  describe('S2 Revenge Planning — mode transition arc', () => {
    it('Day 1 — P1 Rescue (high pressure overrides high energy)', () => {
      const p1Context: P1Context = { energy: 4, sleepBucket: '6-7', highPressureDetected: true };
      const aggregates = baseAggregates({ openLoops: 0, verificationRate7d: 1.0, silenceDays: 0, scheduleMisses7d: 0 });
      const snapshot = assessLoopHealth('s2', aggregates, p1Context, undefined, 'P1', computedAt);
      expect(snapshot.p1).toBe('LOW_ENERGY');
      expect(snapshot.mode).toBe('Rescue');
    });

    it('Day 2 — P1 Rescue (still high pressure)', () => {
      const p1Context: P1Context = { energy: 4, sleepBucket: '7-8', highPressureDetected: true };
      const aggregates = baseAggregates({ openLoops: 0, verificationRate7d: 1.0, silenceDays: 0, scheduleMisses7d: 0 });
      const snapshot = assessLoopHealth('s2', aggregates, p1Context, undefined, 'P1', computedAt);
      expect(snapshot.p1).toBe('LOW_ENERGY');
      expect(snapshot.mode).toBe('Rescue');
    });

    it('Day 5–7 — P1 Neutral (pressure normalizes)', () => {
      const p1Context: P1Context = { energy: 3, sleepBucket: '7-8', highPressureDetected: false };
      const aggregates = baseAggregates({ openLoops: 1, verificationRate7d: 0.8, silenceDays: 0, scheduleMisses7d: 0 });
      const snapshot = assessLoopHealth('s2', aggregates, p1Context, undefined, 'P1', computedAt);
      expect(snapshot.p1).toBe('NEUTRAL');
      expect(snapshot.mode).toBe('Neutral');
    });

    it('Day 16–18 — P1 Boost (autonomy returns)', () => {
      const p1Context: P1Context = { energy: 4, sleepBucket: '7-8', highPressureDetected: false };
      const aggregates = baseAggregates({ openLoops: 1, verificationRate7d: 0.85, silenceDays: 0, scheduleMisses7d: 0 });
      const snapshot = assessLoopHealth('s2', aggregates, p1Context, undefined, 'P1', computedAt);
      expect(snapshot.p1).toBe('HIGH_ENERGY');
      expect(snapshot.mode).toBe('Boost');
    });
  });

  describe('S5 Burnout Runway — mode transition arc', () => {
    it('Day 1 — P1 Rescue (critical state)', () => {
      const p1Context: P1Context = { energy: 2, sleepBucket: '<6', highPressureDetected: true };
      const aggregates = baseAggregates({ silenceDays: 0, stateTrend7d: 'worsening', verificationRate7d: 0.5, openLoops: 2 });
      const snapshot = assessLoopHealth('s5', aggregates, p1Context, undefined, 'P1', computedAt);
      expect(snapshot.p1).toBe('LOW_ENERGY');
      expect(snapshot.mode).toBe('Rescue');
    });

    it('Day 4 — P1 Rescue (re-entry after silence, still low energy)', () => {
      const p1Context: P1Context = { energy: 2, sleepBucket: '6-7', highPressureDetected: false };
      const aggregates = baseAggregates({ silenceDays: 3, openLoops: 0, verificationRate7d: 1.0, stateTrend7d: 'worsening' });
      const snapshot = assessLoopHealth('s5', aggregates, p1Context, undefined, 'P1', computedAt);
      expect(snapshot.p1).toBe('LOW_ENERGY');
      expect(snapshot.mode).toBe('Rescue');
    });

    it('Day 8–10 — P1 Neutral (slow recovery)', () => {
      const p1Context: P1Context = { energy: 3, sleepBucket: '7-8', highPressureDetected: false };
      const aggregates = baseAggregates({ silenceDays: 0, openLoops: 1, verificationRate7d: 0.8, scheduleMisses7d: 0 });
      const snapshot = assessLoopHealth('s5', aggregates, p1Context, undefined, 'P1', computedAt);
      expect(snapshot.p1).toBe('NEUTRAL');
      expect(snapshot.mode).toBe('Neutral');
    });

    it('Day 16–18 — P1 Boost (recovery complete)', () => {
      const p1Context: P1Context = { energy: 4, sleepBucket: '7-8', highPressureDetected: false };
      const aggregates = baseAggregates({ openLoops: 0, verificationRate7d: 0.9, silenceDays: 0, scheduleMisses7d: 0, stateTrend7d: 'improving' });
      const snapshot = assessLoopHealth('s5', aggregates, p1Context, undefined, 'P1', computedAt);
      expect(snapshot.p1).toBe('HIGH_ENERGY');
      expect(snapshot.mode).toBe('Boost');
    });
  });

  describe('S7 Ambitious — mode transition arc', () => {
    it('Day 1 — P1 Boost (fresh ambitious student)', () => {
      const p1Context: P1Context = { energy: 5, sleepBucket: '>=8', highPressureDetected: false };
      const aggregates = baseAggregates({ openLoops: 0, verificationRate7d: 1.0, silenceDays: 0, scheduleMisses7d: 0 });
      const snapshot = assessLoopHealth('s7', aggregates, p1Context, undefined, 'P1', computedAt);
      expect(snapshot.p1).toBe('HIGH_ENERGY');
      expect(snapshot.mode).toBe('Boost');
    });

    it('Day 3 — P1 Boost (still high energy, aggregates not yet bad)', () => {
      const p1Context: P1Context = { energy: 5, sleepBucket: '>=8', highPressureDetected: false };
      const aggregates = baseAggregates({ openLoops: 1, verificationRate7d: 1.0, silenceDays: 0, scheduleMisses7d: 1 });
      const snapshot = assessLoopHealth('s7', aggregates, p1Context, undefined, 'P1', computedAt);
      expect(snapshot.p1).toBe('HIGH_ENERGY');
      expect(snapshot.mode).toBe('Boost');
    });

    it('Day 4 — P1 Neutral (openLoops pile up blocks Boost)', () => {
      const p1Context: P1Context = { energy: 5, sleepBucket: '>=8', highPressureDetected: false };
      const aggregates = baseAggregates({ openLoops: 3, verificationRate7d: 1.0, silenceDays: 0, scheduleMisses7d: 3 });
      const snapshot = assessLoopHealth('s7', aggregates, p1Context, undefined, 'P1', computedAt);
      // openLoops >= 3 blocks HIGH_ENERGY label (assignP1Label requires openLoops < threshold)
      expect(snapshot.p1).toBe('NEUTRAL');
      expect(snapshot.mode).toBe('Neutral');
    });

    it('Day 5 — P1 Neutral (scheduleMisses > 1 blocks Boost)', () => {
      const p1Context: P1Context = { energy: 5, sleepBucket: '>=8', highPressureDetected: false };
      const aggregates = baseAggregates({ openLoops: 2, verificationRate7d: 1.0, silenceDays: 0, scheduleMisses7d: 2 });
      const snapshot = assessLoopHealth('s7', aggregates, p1Context, undefined, 'P1', computedAt);
      expect(snapshot.p1).toBe('HIGH_ENERGY');
      expect(snapshot.mode).toBe('Neutral');
    });

    it('Day 8–10 — P1 Boost (sustained improvement)', () => {
      const p1Context: P1Context = { energy: 5, sleepBucket: '>=8', highPressureDetected: false };
      const aggregates = baseAggregates({ openLoops: 1, verificationRate7d: 0.85, silenceDays: 0, scheduleMisses7d: 1 });
      const snapshot = assessLoopHealth('s7', aggregates, p1Context, undefined, 'P1', computedAt);
      expect(snapshot.p1).toBe('HIGH_ENERGY');
      expect(snapshot.mode).toBe('Boost');
    });
  });

  describe('Gap 1 fix — stateTrend7d worsening caps at Neutral, not Rescue', () => {
    it('worsening trend with excellent current context → Neutral (not Rescue)', () => {
      const p1Context: P1Context = { energy: 4, sleepBucket: '7-8', highPressureDetected: false };
      const aggregates = baseAggregates({ stateTrend7d: 'worsening', openLoops: 0, scheduleMisses7d: 0 });
      const snapshot = assessLoopHealth('gap1', aggregates, p1Context, undefined, 'P1', computedAt);
      // HIGH_ENERGY label; hasStability=false (worsening trend) → mode=Neutral, not Rescue
      expect(snapshot.p1).toBe('HIGH_ENERGY');
      expect(snapshot.mode).toBe('Neutral');
      expect(snapshot.mode).not.toBe('Rescue');
    });

    it('energy ≤ 2 alone still forces LOW_ENERGY → Rescue (no worsening needed)', () => {
      const p1Context: P1Context = { energy: 2, sleepBucket: '7-8', highPressureDetected: false };
      const aggregates = baseAggregates({ stateTrend7d: 'flat' });
      const snapshot = assessLoopHealth('gap1b', aggregates, p1Context, undefined, 'P1', computedAt);
      expect(snapshot.p1).toBe('LOW_ENERGY');
      expect(snapshot.mode).toBe('Rescue');
    });
  });

  describe('S7 P3 — avoidant at SessionEnd', () => {
    it('Day 3 SessionEnd — P3 AVOIDANT (student defers with no retrieval/schedule)', () => {
      const p3Context: P3Context = { hasRetrieval: false, hasSchedule: false };
      const aggregates = baseAggregates({ openLoops: 3, verificationRate7d: 0.5, silenceDays: 0, avoidantExits7d: 2 });
      const snapshot = assessLoopHealth('s7-p3', aggregates, p3Context, undefined, 'P3', computedAt);
      expect(snapshot.p3).toBe('AVOIDANT');
      expect(snapshot.mode).toBe('Rescue');
    });
  });
});
