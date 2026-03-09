import { describe, it, expect } from 'vitest';
import { AssessLoopHealthHandler } from '../../../../application/assess-loop-health/handler';
import type { IGetStudentSignalsPort } from '../../../../application/assess-loop-health/port';
import type { StudentSignals } from '../../../../application/assess-loop-health/port';
import type { IClock } from '../../../../application/shared/port-clock';
import { MissingAggregatesError, InvalidGateContextError } from '../../../../application/assess-loop-health/errors';

function baseAggregates() {
  return {
    pendingChecks: 0,
    openLoops: 0,
    verificationRate7d: 0.8,
    scheduleMisses7d: 0,
    avoidantExits7d: 0,
    skipCount7d: 0,
    silenceDays: 0,
    replanLoopCount7d: 0,
    stateTrend7d: 'flat' as const,
  };
}

describe('AssessLoopHealthHandler', () => {
  const fixedNow = new Date('2025-01-15T12:00:00Z');
  const clock: IClock = { now: () => fixedNow };

  it('returns snapshot when aggregates passed in command', async () => {
    const getSignals: IGetStudentSignalsPort = {
      getSignals: async () => null, // never called
    };
    const handler = new AssessLoopHealthHandler(getSignals, clock);

    const snapshot = await handler.execute({
      studentId: 's1',
      gatePhase: 'P1',
      gateContext: { energy: 3, sleepBucket: '7-8', highPressureDetected: false },
      aggregates: baseAggregates(),
      policy: undefined,
    });

    expect(snapshot.studentId).toBe('s1');
    expect(snapshot.p1).toBeDefined();
    expect(snapshot.p2).toBeDefined();
    expect(snapshot.p3).toBeDefined();
    expect(snapshot.mode).toBeDefined();
    expect(snapshot.evidence).toBeDefined();
    expect(snapshot.computedAt).toBe(fixedNow.toISOString());
  });

  it('throws MissingAggregatesError when GetStudentSignalsPort returns null', async () => {
    const getSignals: IGetStudentSignalsPort = {
      getSignals: async () => null,
    };
    const handler = new AssessLoopHealthHandler(getSignals, clock);

    await expect(
      handler.execute({
        studentId: 'unknown',
        gatePhase: 'P1',
        gateContext: { energy: 3, sleepBucket: '7-8', highPressureDetected: false },
      })
    ).rejects.toThrow(MissingAggregatesError);
  });

  it('fetches signals via port when aggregates not in command', async () => {
    const signals: StudentSignals = {
      aggregates: baseAggregates(),
      policy: undefined,
    };
    const getSignals: IGetStudentSignalsPort = {
      getSignals: async (id) => (id === 's1' ? signals : null),
    };
    const handler = new AssessLoopHealthHandler(getSignals, clock);

    const snapshot = await handler.execute({
      studentId: 's1',
      gatePhase: 'P2',
      gateContext: {
        startLatencyMin: 2,
        replanCount: 0,
        hasStartSignal: true,
        timeSinceIntentSet: 5,
      },
    });

    expect(snapshot.studentId).toBe('s1');
    expect(snapshot.p2).toBeDefined();
  });

  it('throws when studentId missing', async () => {
    const getSignals: IGetStudentSignalsPort = { getSignals: async () => null };
    const handler = new AssessLoopHealthHandler(getSignals, clock);

    await expect(
      handler.execute({
        studentId: '',
        gateContext: { energy: 3, sleepBucket: '7-8', highPressureDetected: false },
      })
    ).rejects.toThrow('studentId is required');
  });

  it('throws when gateContext missing', async () => {
    const getSignals: IGetStudentSignalsPort = { getSignals: async () => null };
    const handler = new AssessLoopHealthHandler(getSignals, clock);

    await expect(
      handler.execute({
        studentId: 's1',
        gateContext: undefined as any,
      })
    ).rejects.toThrow('gateContext is required');
  });

  it('throws InvalidGateContextError when gateContext shape invalid', async () => {
    const getSignals: IGetStudentSignalsPort = { getSignals: async () => null };
    const handler = new AssessLoopHealthHandler(getSignals, clock);

    await expect(
      handler.execute({
        studentId: 's1',
        gateContext: { unknownField: true } as any,
      })
    ).rejects.toThrow(InvalidGateContextError);
  });
});
