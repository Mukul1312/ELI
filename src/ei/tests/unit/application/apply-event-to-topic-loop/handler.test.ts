import { describe, it, expect, beforeEach } from 'vitest';
import { ApplyEventToTopicLoopHandler } from '../../../../application/apply-event-to-topic-loop/handler';
import { InvalidEventPayloadError } from '../../../../application/apply-event-to-topic-loop/errors';
import type { ITopicLoopRepository } from '../../../../domain/topic-loop/repository';
import type { TopicLoop } from '../../../../domain/topic-loop/topic-loop';
import type { TopicLoopId } from '../../../../domain/topic-loop/value-objects';
import { MissingStudentIdError, MissingTopicIdError } from '../../../../domain/topic-loop/errors';

class InMemoryTopicLoopRepository implements ITopicLoopRepository {
  private store = new Map<string, TopicLoop>();

  private key(id: TopicLoopId): string {
    return `${id.studentId}::${id.topicId}`;
  }

  async findById(id: TopicLoopId): Promise<TopicLoop | null> {
    return this.store.get(this.key(id)) ?? null;
  }

  async save(topicLoop: TopicLoop): Promise<void> {
    this.store.set(this.key(topicLoop.id), topicLoop);
  }

  getAll(): TopicLoop[] {
    return Array.from(this.store.values());
  }
}

describe('ApplyEventToTopicLoopHandler', () => {
  let repo: InMemoryTopicLoopRepository;
  let handler: ApplyEventToTopicLoopHandler;

  const t1 = new Date('2025-03-01T10:00:00Z');
  const t2 = new Date('2025-03-02T10:00:00Z');

  beforeEach(() => {
    repo = new InMemoryTopicLoopRepository();
    handler = new ApplyEventToTopicLoopHandler(repo);
  });

  it('creates a new TopicLoop when none exists and applies the event', async () => {
    await handler.execute({
      studentId: 's1',
      topicId: 't1',
      eventType: 'SessionEnd',
      payload: { endedAt: t1.toISOString() },
    });

    const all = repo.getAll();
    expect(all).toHaveLength(1);
    expect(all[0].state.lastEffortAt).toEqual(t1);
  });

  it('loads existing TopicLoop and applies event', async () => {
    await handler.execute({
      studentId: 's1',
      topicId: 't1',
      eventType: 'SessionEnd',
      payload: { endedAt: t1.toISOString() },
    });

    await handler.execute({
      studentId: 's1',
      topicId: 't1',
      eventType: 'RetrievalVerified',
      payload: { verifiedAt: t2.toISOString() },
    });

    const all = repo.getAll();
    expect(all).toHaveLength(1);
    expect(all[0].state.lastEffortAt).toEqual(t1);
    expect(all[0].state.lastRetrievalAt).toEqual(t2);
  });

  it('is idempotent — double-apply yields same state', async () => {
    const command = {
      studentId: 's1',
      topicId: 't1',
      eventType: 'SessionEnd' as const,
      payload: { endedAt: t1.toISOString() },
    };

    await handler.execute(command);
    await handler.execute(command);

    const all = repo.getAll();
    expect(all).toHaveLength(1);
    expect(all[0].state.lastEffortAt).toEqual(t1);
  });

  it('handles unknown event type without error', async () => {
    await handler.execute({
      studentId: 's1',
      topicId: 't1',
      eventType: 'SomeUnknownEvent',
      payload: { foo: 'bar' },
    });

    const all = repo.getAll();
    expect(all).toHaveLength(1);
    expect(all[0].state.lastEffortAt).toBeNull();
    expect(all[0].state.lastRetrievalAt).toBeNull();
    expect(all[0].state.lastScheduledDueAt).toBeNull();
  });

  it('handles RetrievalSkipped as no-op on timestamps', async () => {
    await handler.execute({
      studentId: 's1',
      topicId: 't1',
      eventType: 'SessionEnd',
      payload: { endedAt: t1.toISOString() },
    });

    await handler.execute({
      studentId: 's1',
      topicId: 't1',
      eventType: 'RetrievalSkipped',
      payload: { reason: 'busy', skippedAt: t2.toISOString() },
    });

    const all = repo.getAll();
    expect(all[0].state.lastEffortAt).toEqual(t1);
    expect(all[0].state.lastRetrievalAt).toBeNull();
  });

  it('rejects missing studentId', async () => {
    await expect(
      handler.execute({ studentId: '', topicId: 't1', eventType: 'SessionEnd', payload: { endedAt: t1.toISOString() } }),
    ).rejects.toThrow(MissingStudentIdError);
  });

  it('rejects missing topicId', async () => {
    await expect(
      handler.execute({ studentId: 's1', topicId: '', eventType: 'SessionEnd', payload: { endedAt: t1.toISOString() } }),
    ).rejects.toThrow(MissingTopicIdError);
  });

  it('rejects SessionEnd with missing endedAt', async () => {
    await expect(
      handler.execute({ studentId: 's1', topicId: 't1', eventType: 'SessionEnd', payload: {} }),
    ).rejects.toThrow(InvalidEventPayloadError);
  });

  it('rejects SessionEnd with invalid endedAt', async () => {
    await expect(
      handler.execute({ studentId: 's1', topicId: 't1', eventType: 'SessionEnd', payload: { endedAt: 'not-a-date' } }),
    ).rejects.toThrow(InvalidEventPayloadError);
  });

  it('rejects RetrievalVerified with missing verifiedAt', async () => {
    await expect(
      handler.execute({ studentId: 's1', topicId: 't1', eventType: 'RetrievalVerified', payload: {} }),
    ).rejects.toThrow(InvalidEventPayloadError);
  });

  it('keeps separate TopicLoops for different (studentId, topicId) pairs', async () => {
    await handler.execute({
      studentId: 's1',
      topicId: 't1',
      eventType: 'SessionEnd',
      payload: { endedAt: t1.toISOString() },
    });

    await handler.execute({
      studentId: 's1',
      topicId: 't2',
      eventType: 'RetrievalVerified',
      payload: { verifiedAt: t2.toISOString() },
    });

    const all = repo.getAll();
    expect(all).toHaveLength(2);
  });
});
