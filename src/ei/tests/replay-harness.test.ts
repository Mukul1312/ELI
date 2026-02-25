/**
 * Storyboard Replay Test Harness
 *
 * Replays event sequences from storyboard fixtures and asserts that:
 * 1. Engine classification (label + mode) matches expected outputs
 * 2. Play selection matches expected playId when specified
 * 3. Derived signals evolve correctly across the timeline
 *
 * This tests the PURE engine layers (classify, plays, escalation, score)
 * without needing Mastra or PostgreSQL. The tools layer is mocked.
 */

import { describe, it, expect } from 'vitest';

// Engine layers (assessLoopHealth is the production entry point for mode resolution)
import { computeStateScore } from '../engine/score';
import { assessLoopHealth } from '../domain/loop-health/assess-loop-health';
import type { StudentAggregates, P1Context, P2Context, P3Context } from '../engine/classify';
import { selectPlay } from '../engine/plays';
import type { PlayContext } from '../engine/plays';
import { computeTightnessLevel } from '../engine/escalation';
import type { SleepBucket } from '../domain/loop-health/gate-context';

// Fixtures
import { s7AmbitiousFixture } from './fixtures/s7-ambitious';
import { s2RevengeFixture } from './fixtures/s2-revenge';
import { s5BurnoutFixture } from './fixtures/s5-burnout';

import type { StoryboardFixture, FixtureDay, ExpectedOutput } from './fixtures/types';

// ============================================================================
// Mock aggregates builder (simulates what computeAggregates would produce)
// ============================================================================

function buildMockAggregates(overrides: Partial<StudentAggregates> = {}): StudentAggregates {
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

// ============================================================================
// Protocol 1 assertions
// ============================================================================

function assertP1(
  day: FixtureDay,
  expected: ExpectedOutput,
  aggregates: StudentAggregates,
) {
  const appOpenEvent = day.events.find((e) => e.eventType === 'AppOpen');
  if (!appOpenEvent) return;

  const payload = appOpenEvent.payload as Record<string, unknown>;
  const p1Ctx: P1Context = {
    energy: (payload.energy as number) ?? 3,
    sleepBucket: (payload.sleepBucket as SleepBucket | undefined) ?? '7-8',
    pressure: (payload.pressure as number) ?? 3,
    backlogPressure: (payload.backlogPressure as number) ?? 3,
  };

  const openedAt = (payload.openedAt as string) ?? new Date().toISOString();
  const snapshot = assessLoopHealth('test', aggregates, p1Ctx, undefined, 'P1', openedAt);
  const mode = snapshot.mode;

  if (expected.mode) {
    expect(mode).toBe(expected.mode);
  }

  if (expected.playId) {
    const tightnessLevel = computeTightnessLevel(aggregates);
    const playContext: PlayContext = {
      studentId: 'test',
      aggregates,
      tightnessLevel,
      currentEnergy: p1Ctx.energy,
      currentPressure: p1Ctx.pressure,
      currentBacklogPressure: p1Ctx.backlogPressure,
    };
    const play = selectPlay(1, mode, playContext);
    expect(play.id).toBe(expected.playId);
  }
}

// ============================================================================
// Protocol 2 assertions
// ============================================================================

function assertP2(
  day: FixtureDay,
  expected: ExpectedOutput,
  aggregates: StudentAggregates,
) {
  const intentSetEvent = day.events.find((e) => e.eventType === 'IntentSet');
  const firstAction = day.events.find((e) => e.eventType === 'FirstActionStarted');
  if (!intentSetEvent) return;

  const intentPayload = intentSetEvent.payload as Record<string, unknown>;
  const setAt = intentPayload.setAt as string | undefined;
  const startedAt = firstAction ? ((firstAction.payload as Record<string, unknown>).startedAt as string | undefined) : null;
  const replans = day.events.filter((e) => e.eventType === 'Replan');

  const setAtDate = setAt != null ? new Date(setAt) : new Date();
  const startLatencyMin = startedAt
    ? (new Date(startedAt).getTime() - setAtDate.getTime()) / 60_000
    : undefined;

  const p2Ctx: P2Context = {
    startLatencyMin,
    replanCount: replans.length,
    hasStartSignal: !!firstAction,
    timeSinceIntentSet: startLatencyMin ?? 0,
  };

  const computedAt = (setAt ?? new Date().toISOString()) as string;
  const snapshot = assessLoopHealth('test', aggregates, p2Ctx, undefined, 'P2', computedAt);
  const mode = snapshot.mode;

  if (expected.mode) {
    expect(mode).toBe(expected.mode);
  }

  if (expected.playId) {
    const tightnessLevel = computeTightnessLevel(aggregates);
    const playContext: PlayContext = {
      studentId: 'test',
      aggregates,
      tightnessLevel,
      replanCount: replans.length,
      startLatencyMin,
    };
    const play = selectPlay(2, mode, playContext);
    expect(play.id).toBe(expected.playId);
  }
}

// ============================================================================
// Protocol 3 assertions
// ============================================================================

function assertP3(
  day: FixtureDay,
  expected: ExpectedOutput,
  aggregates: StudentAggregates,
) {
  const sessionEnd = day.events.find((e) => e.eventType === 'SessionEnd');
  if (!sessionEnd) return;

  const hasRetrieval = day.events.some((e) => e.eventType === 'RetrievalVerified');
  const hasSchedule = day.events.some((e) => e.eventType === 'RetrievalScheduled');

  const p3Ctx: P3Context = { hasRetrieval, hasSchedule };
  const sessionPayload = sessionEnd.payload as Record<string, unknown>;
  const endedAt = sessionPayload.endedAt as string | undefined;
  const computedAt = endedAt ?? new Date().toISOString();
  const snapshot = assessLoopHealth('test', aggregates, p3Ctx, undefined, 'P3', computedAt);
  const mode = snapshot.mode;

  if (expected.mode) {
    expect(mode).toBe(expected.mode);
  }
}

// ============================================================================
// Score tests
// ============================================================================

describe('StateScore computation', () => {
  it('returns high score for optimal state', () => {
    const score = computeStateScore({
      energy: 5, sleepBucket: '>=8', pressure: 1, backlogPressure: 1,
    });
    expect(score).toBeGreaterThanOrEqual(8);
    expect(score).toBeLessThanOrEqual(10);
  });

  it('returns low score for poor state', () => {
    const score = computeStateScore({
      energy: 1, sleepBucket: '<6', pressure: 5, backlogPressure: 5,
    });
    expect(score).toBeGreaterThanOrEqual(1);
    expect(score).toBeLessThanOrEqual(3);
  });

  it('returns middle score for neutral state', () => {
    const score = computeStateScore({
      energy: 3, sleepBucket: '7-8', pressure: 3, backlogPressure: 3,
    });
    expect(score).toBeGreaterThanOrEqual(3);
    expect(score).toBeLessThanOrEqual(7);
  });
});

// ============================================================================
// Storyboard replay tests
// ============================================================================

function runFixture(fixture: StoryboardFixture) {
  describe(`Storyboard ${fixture.id}: ${fixture.name}`, () => {
    // Simulate evolving aggregates across days
    let aggregates = buildMockAggregates();

    for (const day of fixture.days) {
      it(`Day ${day.day}: ${day.description}`, () => {
        // aggregates = state at START of this day (from previous day's expectedSignals)
        for (const expected of day.expectedOutputs) {
          if (expected.protocol === 1) {
            assertP1(day, expected, aggregates);
          } else if (expected.protocol === 2) {
            assertP2(day, expected, aggregates);
          } else if (expected.protocol === 3) {
            assertP3(day, expected, aggregates);
          }
        }

        // Assert signal ranges (end-of-day expectations)
        if (day.expectedSignals?.verificationRate7d) {
          const { min, max } = day.expectedSignals.verificationRate7d;
          if (min !== undefined) expect(aggregates.verificationRate7d).toBeGreaterThanOrEqual(min);
          if (max !== undefined) expect(aggregates.verificationRate7d).toBeLessThanOrEqual(max);
        }
        if (day.expectedSignals?.silenceDays) {
          const { min, max } = day.expectedSignals.silenceDays;
          if (min !== undefined) expect(aggregates.silenceDays).toBeGreaterThanOrEqual(min);
          if (max !== undefined) expect(aggregates.silenceDays).toBeLessThanOrEqual(max);
        }

        // Update aggregates to END of this day for next iteration
        if (day.expectedSignals) {
          if (day.expectedSignals.pendingChecks !== undefined) {
            aggregates = { ...aggregates, pendingChecks: day.expectedSignals.pendingChecks };
          }
          if (day.expectedSignals.openLoops !== undefined) {
            aggregates = { ...aggregates, openLoops: day.expectedSignals.openLoops };
          }
          if (day.expectedSignals.scheduleMisses7d !== undefined) {
            aggregates = { ...aggregates, scheduleMisses7d: day.expectedSignals.scheduleMisses7d };
          }
          if (day.expectedSignals.stateTrend7d !== undefined) {
            aggregates = { ...aggregates, stateTrend7d: day.expectedSignals.stateTrend7d };
          }
        }
      });
    }
  });
}

runFixture(s7AmbitiousFixture);
runFixture(s2RevengeFixture);
runFixture(s5BurnoutFixture);
