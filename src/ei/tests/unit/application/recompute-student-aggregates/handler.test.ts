import { describe, it, expect, beforeEach } from 'vitest';
import { RecomputeStudentAggregatesHandler } from '../../../../application/recompute-student-aggregates/handler';
import type { IStudentAggregatesRepository } from '../../../../domain/student-aggregates/repository';
import type { StudentAggregates } from '../../../../domain/student-aggregates/student-aggregates';
import type { StudentAggregatesId } from '../../../../domain/student-aggregates/value-objects';
import type { IStudentEventStreamReader, StudentStreamedEvent } from '../../../../application/shared/port-student-event-stream-reader';
import type { ITopicStateReader, TopicStateSnapshot } from '../../../../application/shared/port-topic-state-reader';
import type { IClock } from '../../../../application/shared/port-clock';
import { MissingStudentIdError } from '../../../../domain/student-aggregates/errors';

class InMemoryStudentAggregatesRepository implements IStudentAggregatesRepository {
  private store = new Map<string, StudentAggregates>();

  async findById(id: StudentAggregatesId): Promise<StudentAggregates | null> {
    return this.store.get(id.studentId) ?? null;
  }

  async save(agg: StudentAggregates): Promise<void> {
    this.store.set(agg.studentId, agg);
  }

  getAll(): StudentAggregates[] {
    return Array.from(this.store.values());
  }
}

class InMemoryStudentEventStreamReader implements IStudentEventStreamReader {
  constructor(
    private readonly events: StudentStreamedEvent[] = [],
    private readonly latest: StudentStreamedEvent | null = null,
  ) {}

  async readEventsForStudentInWindow(): Promise<StudentStreamedEvent[]> {
    return this.events;
  }

  async readLatestEvent(): Promise<StudentStreamedEvent | null> {
    return this.latest;
  }
}

class InMemoryTopicStateReader implements ITopicStateReader {
  constructor(private readonly states: TopicStateSnapshot[] = []) {}

  async getAllTopicStates(): Promise<TopicStateSnapshot[]> {
    return this.states;
  }
}

const FIXED_NOW = new Date('2025-03-15T12:00:00Z');
const GRACE_MS = 12 * 60 * 60 * 1000;

function makeCommand(overrides: { studentId?: string; now?: Date; graceMs?: number } = {}) {
  return { studentId: 's1', graceMs: GRACE_MS, ...overrides };
}

const fixedClock: IClock = { now: () => FIXED_NOW };

describe('RecomputeStudentAggregatesHandler', () => {
  let repo: InMemoryStudentAggregatesRepository;

  beforeEach(() => {
    repo = new InMemoryStudentAggregatesRepository();
  });

  it('returns zeroed metrics when no events or topic states exist', async () => {
    const handler = new RecomputeStudentAggregatesHandler(
      repo,
      new InMemoryStudentEventStreamReader(),
      new InMemoryTopicStateReader(),
      fixedClock,
    );

    const result = await handler.execute(makeCommand());

    expect(result.studentId).toBe('s1');
    expect(result.pendingChecks).toBe(0);
    expect(result.openLoops).toBe(0);
    expect(result.verificationRate7d).toBe(1.0);
    expect(result.silenceDays).toBe(0);
    expect(result.loopLatencyTrend).toBeNull();
  });

  it('persists the aggregate via repository', async () => {
    const handler = new RecomputeStudentAggregatesHandler(
      repo,
      new InMemoryStudentEventStreamReader(),
      new InMemoryTopicStateReader(),
      fixedClock,
    );

    await handler.execute(makeCommand());

    const saved = repo.getAll();
    expect(saved).toHaveLength(1);
    expect(saved[0].studentId).toBe('s1');
  });

  it('computes metrics from events and topic states', async () => {
    const events: StudentStreamedEvent[] = [
      { eventType: 'SessionEnd', topicId: 'topic-1', occurredAt: new Date('2025-03-14T10:00:00Z'), payload: {} },
      { eventType: 'RetrievalVerified', topicId: 'topic-1', occurredAt: new Date('2025-03-14T14:00:00Z'), payload: {} },
    ];
    const topicStates: TopicStateSnapshot[] = [
      { topicId: 'topic-1', lastEffortAt: new Date('2025-03-14T10:00:00Z'), lastRetrievalAt: new Date('2025-03-14T14:00:00Z'), lastScheduledDueAt: null },
    ];

    const handler = new RecomputeStudentAggregatesHandler(
      repo,
      new InMemoryStudentEventStreamReader(events),
      new InMemoryTopicStateReader(topicStates),
      fixedClock,
    );

    const result = await handler.execute(makeCommand());

    expect(result.pendingChecks).toBe(0);
    expect(result.verificationRate7d).toBe(1.0);
    expect(result.avoidantExits7d).toBe(0);
    expect(result.silenceDays).toBe(0);
  });

  it('uses command.now when provided instead of clock', async () => {
    const customNow = new Date('2025-03-20T12:00:00Z');
    const threeDaysBefore = new Date(customNow.getTime() - 3 * 24 * 60 * 60 * 1000);
    const events: StudentStreamedEvent[] = [
      { eventType: 'SessionEnd', topicId: 'topic-1', occurredAt: threeDaysBefore, payload: {} },
    ];

    const handler = new RecomputeStudentAggregatesHandler(
      repo,
      new InMemoryStudentEventStreamReader(events),
      new InMemoryTopicStateReader(),
      fixedClock,
    );

    const result = await handler.execute(makeCommand({ now: customNow }));
    expect(result.silenceDays).toBe(3);
  });

  it('detects open loops from overdue schedules', async () => {
    const overdueDate = new Date(FIXED_NOW.getTime() - GRACE_MS - 60_000);
    const topicStates: TopicStateSnapshot[] = [
      { topicId: 't1', lastEffortAt: null, lastRetrievalAt: null, lastScheduledDueAt: overdueDate },
    ];

    const handler = new RecomputeStudentAggregatesHandler(
      repo,
      new InMemoryStudentEventStreamReader(),
      new InMemoryTopicStateReader(topicStates),
      fixedClock,
    );

    const result = await handler.execute(makeCommand());
    expect(result.openLoops).toBe(1);
    expect(result.scheduleMisses7d).toBe(1);
  });

  it('rejects empty studentId', async () => {
    const handler = new RecomputeStudentAggregatesHandler(
      repo,
      new InMemoryStudentEventStreamReader(),
      new InMemoryTopicStateReader(),
      fixedClock,
    );

    await expect(handler.execute({ studentId: '', graceMs: GRACE_MS })).rejects.toThrow(
      MissingStudentIdError,
    );
  });

  it('is idempotent — calling twice yields same result', async () => {
    const events: StudentStreamedEvent[] = [
      { eventType: 'SessionEnd', topicId: 'topic-1', occurredAt: new Date('2025-03-14T10:00:00Z'), payload: {} },
    ];

    const handler = new RecomputeStudentAggregatesHandler(
      repo,
      new InMemoryStudentEventStreamReader(events),
      new InMemoryTopicStateReader(),
      fixedClock,
    );

    const result1 = await handler.execute(makeCommand());
    const result2 = await handler.execute(makeCommand());

    expect(result1).toEqual(result2);
  });
});
