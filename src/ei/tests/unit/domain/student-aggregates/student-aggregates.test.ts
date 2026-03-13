import { describe, it, expect } from 'vitest';
import { StudentAggregates, type DomainEventSnapshot, type TopicStateSnapshot, type RecomputeInput } from '../../../../domain/student-aggregates/student-aggregates';
import { StudentAggregatesId } from '../../../../domain/student-aggregates/value-objects';
import { MissingStudentIdError } from '../../../../domain/student-aggregates/errors';

const NOW = new Date('2025-03-15T12:00:00Z');
const SEVEN_DAYS_AGO = new Date(NOW.getTime() - 7 * 24 * 60 * 60 * 1000);
const GRACE_MS = 12 * 60 * 60 * 1000;

function makeId(studentId = 'student-1') {
  return StudentAggregatesId.create(studentId);
}

function makeInput(overrides: Partial<RecomputeInput> = {}): RecomputeInput {
  return {
    now: NOW,
    sevenDaysAgo: SEVEN_DAYS_AGO,
    graceMs: GRACE_MS,
    events: [],
    topicStates: [],
    allTimeLatestEvent: null,
    hasPriorAppOpen: false,
    lastIdentityShownAt: null,
    ...overrides,
  };
}

function makeEvent(type: string, occurredAt: Date, topicId: string | null = 'topic-1', payload: Record<string, unknown> = {}): DomainEventSnapshot {
  return { eventType: type, topicId, occurredAt, payload };
}

function makeTopicState(overrides: Partial<TopicStateSnapshot> = {}): TopicStateSnapshot {
  return {
    topicId: 'topic-1',
    lastEffortAt: null,
    lastRetrievalAt: null,
    lastScheduledDueAt: null,
    effortCountTotal: 0,
    lastTaskType: null,
    ...overrides,
  };
}

describe('StudentAggregatesId', () => {
  it('throws MissingStudentIdError when studentId is empty', () => {
    expect(() => StudentAggregatesId.create('')).toThrow(MissingStudentIdError);
    expect(() => StudentAggregatesId.create('   ')).toThrow(MissingStudentIdError);
  });

  it('trims whitespace from valid studentId', () => {
    const id = StudentAggregatesId.create('  s1  ');
    expect(id.studentId).toBe('s1');
  });
});

describe('StudentAggregates.recompute', () => {
  describe('no events, no topic states', () => {
    it('returns zeroed metrics', () => {
      const agg = StudentAggregates.recompute(makeId(), makeInput());
      const m = agg.metrics;

      expect(m.pendingChecks).toBe(0);
      expect(m.openLoops).toBe(0);
      expect(m.verificationRate7d).toBe(1.0);
      expect(m.scheduleMisses7d).toBe(0);
      expect(m.avoidantExits7d).toBe(0);
      expect(m.skipCount7d).toBe(0);
      expect(m.silenceDays).toBe(0);
      expect(m.startLatencyMinMedian7d).toBeNull();
      expect(m.intentAcceptanceRate7d).toBeNull();
      expect(m.replanLoopCount7d).toBe(0);
      expect(m.stateTrend7d).toBe('flat');
      expect(m.loopLatencyTrend).toBeNull();
    });
  });

  describe('simple session + verification flow', () => {
    it('computes pendingChecks and verificationRate correctly', () => {
      const events = [
        makeEvent('SessionEnd', new Date('2025-03-14T10:00:00Z')),
        makeEvent('RetrievalVerified', new Date('2025-03-14T14:00:00Z')),
      ];
      const topicStates = [
        makeTopicState({ lastEffortAt: new Date('2025-03-14T10:00:00Z'), lastRetrievalAt: new Date('2025-03-14T14:00:00Z') }),
      ];

      const agg = StudentAggregates.recompute(makeId(), makeInput({ events, topicStates }));
      const m = agg.metrics;

      expect(m.pendingChecks).toBe(0);
      expect(m.verificationRate7d).toBe(1.0);
      expect(m.avoidantExits7d).toBe(0);
    });
  });

  describe('pending checks', () => {
    it('counts topics where effort > retrieval', () => {
      const topicStates = [
        makeTopicState({ topicId: 't1', lastEffortAt: new Date('2025-03-14T10:00:00Z'), lastRetrievalAt: null }),
        makeTopicState({ topicId: 't2', lastEffortAt: new Date('2025-03-14T10:00:00Z'), lastRetrievalAt: new Date('2025-03-14T14:00:00Z') }),
      ];

      const agg = StudentAggregates.recompute(makeId(), makeInput({ topicStates }));
      expect(agg.metrics.pendingChecks).toBe(1);
    });
  });

  describe('openLoops: absent commitment (studied without scheduling)', () => {
    it('counts topic studied but never scheduled after grace period', () => {
      const effortAt = new Date(NOW.getTime() - GRACE_MS - 60_000); // past grace
      const topicStates = [
        makeTopicState({ lastEffortAt: effortAt, lastScheduledDueAt: null, lastRetrievalAt: null }),
      ];
      const agg = StudentAggregates.recompute(makeId(), makeInput({ topicStates }));
      expect(agg.metrics.openLoops).toBe(1);
    });

    it('does not count topic studied within grace period', () => {
      const effortAt = new Date(NOW.getTime() - GRACE_MS + 60_000); // still within grace
      const topicStates = [
        makeTopicState({ lastEffortAt: effortAt, lastScheduledDueAt: null, lastRetrievalAt: null }),
      ];
      const agg = StudentAggregates.recompute(makeId(), makeInput({ topicStates }));
      expect(agg.metrics.openLoops).toBe(0);
    });

    it('does not count topic studied but retrieved even without a schedule', () => {
      const effortAt = new Date(NOW.getTime() - GRACE_MS - 60_000);
      const retrievedAt = new Date(effortAt.getTime() + 1000); // retrieved after effort
      const topicStates = [
        makeTopicState({ lastEffortAt: effortAt, lastScheduledDueAt: null, lastRetrievalAt: retrievedAt }),
      ];
      const agg = StudentAggregates.recompute(makeId(), makeInput({ topicStates }));
      expect(agg.metrics.openLoops).toBe(0);
    });
  });

  describe('overdue schedule (openLoops + scheduleMisses7d)', () => {
    it('counts overdue topics past grace period', () => {
      const overdueDate = new Date(NOW.getTime() - GRACE_MS - 60_000);
      const topicStates = [
        makeTopicState({
          topicId: 't1',
          lastScheduledDueAt: overdueDate,
          lastRetrievalAt: new Date(overdueDate.getTime() - 1000),
        }),
      ];

      const agg = StudentAggregates.recompute(makeId(), makeInput({ topicStates }));
      expect(agg.metrics.openLoops).toBe(1);
      expect(agg.metrics.scheduleMisses7d).toBe(1);
    });

    it('does not count topics retrieved after due date', () => {
      const overdueDate = new Date(NOW.getTime() - GRACE_MS - 60_000);
      const topicStates = [
        makeTopicState({
          lastScheduledDueAt: overdueDate,
          lastRetrievalAt: new Date(overdueDate.getTime() + 1000),
        }),
      ];

      const agg = StudentAggregates.recompute(makeId(), makeInput({ topicStates }));
      expect(agg.metrics.openLoops).toBe(0);
      expect(agg.metrics.scheduleMisses7d).toBe(0);
    });
  });

  describe('silence detection', () => {
    it('computes silenceDays from last meaningful event', () => {
      const threeDaysAgo = new Date(NOW.getTime() - 3 * 24 * 60 * 60 * 1000);
      const events = [makeEvent('SessionEnd', threeDaysAgo)];

      const agg = StudentAggregates.recompute(makeId(), makeInput({ events }));
      expect(agg.metrics.silenceDays).toBe(3);
    });

    it('falls back to allTimeLatestEvent when no meaningful events in window', () => {
      const tenDaysAgo = new Date(NOW.getTime() - 10 * 24 * 60 * 60 * 1000);
      const allTimeLatestEvent = makeEvent('AppOpen', tenDaysAgo);

      const agg = StudentAggregates.recompute(makeId(), makeInput({ allTimeLatestEvent }));
      expect(agg.metrics.silenceDays).toBe(10);
    });
  });

  describe('avoidant exits', () => {
    it('counts SessionEnd without any same-day verification', () => {
      const day = new Date('2025-03-14T10:00:00Z');
      const events = [makeEvent('SessionEnd', day, 'topic-1')];

      const agg = StudentAggregates.recompute(makeId(), makeInput({ events }));
      expect(agg.metrics.avoidantExits7d).toBe(1);
    });

    it('does not count if verification exists same day', () => {
      const day = new Date('2025-03-14T10:00:00Z');
      const events = [
        makeEvent('SessionEnd', day, 'topic-1'),
        makeEvent('RetrievalVerified', new Date('2025-03-14T14:00:00Z'), 'topic-1'),
      ];

      const agg = StudentAggregates.recompute(makeId(), makeInput({ events }));
      expect(agg.metrics.avoidantExits7d).toBe(0);
    });
  });

  describe('rate clamping', () => {
    it('clamps verificationRate7d to 1.0', () => {
      const events = [
        makeEvent('SessionEnd', new Date('2025-03-14T10:00:00Z')),
        makeEvent('RetrievalVerified', new Date('2025-03-14T11:00:00Z')),
        makeEvent('RetrievalScheduled', new Date('2025-03-14T12:00:00Z')),
        makeEvent('VerificationCompleted', new Date('2025-03-14T13:00:00Z')),
      ];

      const agg = StudentAggregates.recompute(makeId(), makeInput({ events }));
      expect(agg.metrics.verificationRate7d).toBeLessThanOrEqual(1.0);
    });
  });

  describe('skipCount7d', () => {
    it('counts RetrievalSkipped events', () => {
      const events = [
        makeEvent('RetrievalSkipped', new Date('2025-03-14T10:00:00Z')),
        makeEvent('RetrievalSkipped', new Date('2025-03-14T11:00:00Z')),
      ];

      const agg = StudentAggregates.recompute(makeId(), makeInput({ events }));
      expect(agg.metrics.skipCount7d).toBe(2);
    });
  });

  describe('intentAcceptanceRate7d', () => {
    it('returns null when no SessionIntentIssued', () => {
      const agg = StudentAggregates.recompute(makeId(), makeInput());
      expect(agg.metrics.intentAcceptanceRate7d).toBeNull();
    });

    it('computes ratio of accepted/edited to issued', () => {
      const events = [
        makeEvent('SessionIntentIssued', new Date('2025-03-14T10:00:00Z')),
        makeEvent('SessionIntentIssued', new Date('2025-03-14T11:00:00Z')),
        makeEvent('IntentResponse', new Date('2025-03-14T10:05:00Z'), null, { decision: 'accepted' }),
      ];

      const agg = StudentAggregates.recompute(makeId(), makeInput({ events }));
      expect(agg.metrics.intentAcceptanceRate7d).toBe(0.5);
    });
  });

  describe('startLatencyMinMedian7d', () => {
    it('returns null when no IntentSet/FirstActionStarted pairs', () => {
      const agg = StudentAggregates.recompute(makeId(), makeInput());
      expect(agg.metrics.startLatencyMinMedian7d).toBeNull();
    });

    it('computes median latency in minutes', () => {
      const events = [
        makeEvent('IntentSet', new Date('2025-03-14T10:00:00Z'), 'topic-1'),
        makeEvent('FirstActionStarted', new Date('2025-03-14T10:05:00Z'), 'topic-1'),
      ];

      const agg = StudentAggregates.recompute(makeId(), makeInput({ events }));
      expect(agg.metrics.startLatencyMinMedian7d).toBe(5);
    });
  });

  describe('replanLoopCount7d', () => {
    it('returns count of Replan events in 7d', () => {
      const events = [makeEvent('Replan', new Date('2025-03-14T10:00:00Z'))];
      const agg = StudentAggregates.recompute(makeId(), makeInput({ events }));
      expect(agg.metrics.replanLoopCount7d).toBe(1);
    });

    it('returns count when multiple Replan events', () => {
      const events = [
        makeEvent('Replan', new Date('2025-03-14T10:00:00Z')),
        makeEvent('Replan', new Date('2025-03-14T11:00:00Z')),
        makeEvent('Replan', new Date('2025-03-14T12:00:00Z')),
      ];
      const agg = StudentAggregates.recompute(makeId(), makeInput({ events }));
      expect(agg.metrics.replanLoopCount7d).toBe(3);
    });
  });

  describe('stateTrend7d', () => {
    it('returns flat with fewer than 2 AppOpen', () => {
      const agg = StudentAggregates.recompute(makeId(), makeInput());
      expect(agg.metrics.stateTrend7d).toBe('flat');
    });

    it('returns improving when energy rises by 1+', () => {
      const events = [
        makeEvent('AppOpen', new Date('2025-03-10T10:00:00Z'), null, { energy: 2 }),
        makeEvent('AppOpen', new Date('2025-03-14T10:00:00Z'), null, { energy: 4 }),
      ];
      const agg = StudentAggregates.recompute(makeId(), makeInput({ events }));
      expect(agg.metrics.stateTrend7d).toBe('improving');
    });

    it('returns worsening when energy drops by 1+', () => {
      const events = [
        makeEvent('AppOpen', new Date('2025-03-10T10:00:00Z'), null, { energy: 4 }),
        makeEvent('AppOpen', new Date('2025-03-14T10:00:00Z'), null, { energy: 2 }),
      ];
      const agg = StudentAggregates.recompute(makeId(), makeInput({ events }));
      expect(agg.metrics.stateTrend7d).toBe('worsening');
    });
  });

  describe('idempotency', () => {
    it('two calls with same input produce equal metrics', () => {
      const events = [
        makeEvent('SessionEnd', new Date('2025-03-14T10:00:00Z')),
        makeEvent('RetrievalVerified', new Date('2025-03-14T14:00:00Z')),
      ];
      const input = makeInput({ events });

      const a = StudentAggregates.recompute(makeId(), input);
      const b = StudentAggregates.recompute(makeId(), input);

      expect(a.metrics).toEqual(b.metrics);
    });
  });
});
