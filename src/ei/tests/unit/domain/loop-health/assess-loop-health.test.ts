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

  describe('S2 lowCapacity', () => {
    it('returns P1 LOW_ENERGY when pressure high', () => {
      const p1Context: P1Context = { energy: 4, sleepBucket: '6-7', pressure: 5, backlogPressure: 4 };
      const aggregates = baseAggregates({ openLoops: 1, verificationRate7d: 0.8 });
      const snapshot = assessLoopHealth('s2', aggregates, p1Context, undefined, 'P1', computedAt);
      expect(snapshot.p1).toBe('LOW_ENERGY');
      expect(['Rescue', 'Neutral']).toContain(snapshot.mode);
    });
  });

  describe('S5 lowEnergy', () => {
    it('returns P1 LOW_ENERGY and mode Rescue when energy low and stateTrend worsening', () => {
      const p1Context: P1Context = { energy: 2, sleepBucket: '<6', pressure: 4, backlogPressure: 5 };
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
      const p1Context: P1Context = { energy: 3, sleepBucket: '7-8', pressure: 2, backlogPressure: 2 };
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
        { energy: 3, sleepBucket: '7-8', pressure: 2, backlogPressure: 2 },
        undefined,
        'P1',
        computedAt
      );
      expect(snapshot.evidence).toHaveProperty('openLoops');
      expect(snapshot.evidence).not.toHaveProperty('events');
    });
  });
});
