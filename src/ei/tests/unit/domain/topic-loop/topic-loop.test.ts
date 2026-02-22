import { describe, it, expect } from 'vitest';
import { TopicLoop } from '../../../../domain/topic-loop/topic-loop';
import { TopicLoopId, TopicLoopState } from '../../../../domain/topic-loop/value-objects';

function makeLoop(studentId = 'student-1', topicId = 'topic-1') {
  return TopicLoop.empty(TopicLoopId.create(studentId, topicId));
}

describe('TopicLoop aggregate', () => {
  const t1 = new Date('2025-03-01T10:00:00Z');
  const t2 = new Date('2025-03-02T10:00:00Z');
  const t3 = new Date('2025-03-03T10:00:00Z');

  describe('in-order events', () => {
    it('applies SessionEnd → RetrievalScheduled → RetrievalVerified', () => {
      const loop = makeLoop();
      loop.applyEvent('SessionEnd', { endedAt: t1.toISOString() });
      loop.applyEvent('RetrievalScheduled', { dueAt: t2.toISOString() });
      loop.applyEvent('RetrievalVerified', { verifiedAt: t3.toISOString() });

      expect(loop.state.lastEffortAt).toEqual(t1);
      expect(loop.state.lastScheduledDueAt).toEqual(t2);
      expect(loop.state.lastRetrievalAt).toEqual(t3);
    });
  });

  describe('out-of-order events', () => {
    it('produces same final state regardless of event order', () => {
      const loop = makeLoop();
      loop.applyEvent('RetrievalVerified', { verifiedAt: t3.toISOString() });
      loop.applyEvent('SessionEnd', { endedAt: t1.toISOString() });

      expect(loop.state.lastEffortAt).toEqual(t1);
      expect(loop.state.lastRetrievalAt).toEqual(t3);
    });
  });

  describe('duplicate event', () => {
    it('is idempotent — same state after double apply', () => {
      const loop = makeLoop();
      loop.applyEvent('RetrievalVerified', { verifiedAt: t2.toISOString() });
      loop.applyEvent('RetrievalVerified', { verifiedAt: t2.toISOString() });

      expect(loop.state.lastRetrievalAt).toEqual(t2);
    });
  });

  describe('stale event', () => {
    it('does not regress — later SessionEnd(t1) then stale SessionEnd(t0)', () => {
      const loop = makeLoop();
      loop.applyEvent('SessionEnd', { endedAt: t2.toISOString() });
      loop.applyEvent('SessionEnd', { endedAt: t1.toISOString() });

      expect(loop.state.lastEffortAt).toEqual(t2);
    });
  });

  describe('first event on new TopicLoop', () => {
    it('sets only the relevant field; others remain null', () => {
      const loop = makeLoop();
      loop.applyEvent('SessionEnd', { endedAt: t1.toISOString() });

      expect(loop.state.lastEffortAt).toEqual(t1);
      expect(loop.state.lastRetrievalAt).toBeNull();
      expect(loop.state.lastScheduledDueAt).toBeNull();
    });
  });

  describe('RetrievalSkipped', () => {
    it('does not update any timestamp', () => {
      const loop = makeLoop();
      loop.applyEvent('SessionEnd', { endedAt: t1.toISOString() });
      loop.applyEvent('RetrievalSkipped', { reason: 'not-ready', skippedAt: t2.toISOString() });

      expect(loop.state.lastEffortAt).toEqual(t1);
      expect(loop.state.lastRetrievalAt).toBeNull();
      expect(loop.state.lastScheduledDueAt).toBeNull();
    });
  });

  describe('ScheduleMissed', () => {
    it('does not update any timestamp', () => {
      const loop = makeLoop();
      loop.applyEvent('SessionEnd', { endedAt: t1.toISOString() });
      loop.applyEvent('ScheduleMissed', { missedAt: t2.toISOString() });

      expect(loop.state.lastEffortAt).toEqual(t1);
      expect(loop.state.lastRetrievalAt).toBeNull();
      expect(loop.state.lastScheduledDueAt).toBeNull();
    });
  });

  describe('VerificationCompleted', () => {
    it('updates lastRetrievalAt using completedAt', () => {
      const loop = makeLoop();
      loop.applyEvent('VerificationCompleted', { completedAt: t2.toISOString() });

      expect(loop.state.lastRetrievalAt).toEqual(t2);
    });
  });

  describe('unknown event type', () => {
    it('is silently ignored', () => {
      const loop = makeLoop();
      loop.applyEvent('SomeUnknownEvent', { foo: 'bar' });

      expect(loop.state.lastEffortAt).toBeNull();
      expect(loop.state.lastRetrievalAt).toBeNull();
      expect(loop.state.lastScheduledDueAt).toBeNull();
    });
  });

  describe('boundary timestamp (equal)', () => {
    it('last_effort_at unchanged when endedAt equals current', () => {
      const loop = makeLoop();
      loop.applyEvent('SessionEnd', { endedAt: t1.toISOString() });
      loop.applyEvent('SessionEnd', { endedAt: t1.toISOString() });

      expect(loop.state.lastEffortAt).toEqual(t1);
    });
  });

  describe('reconstitute', () => {
    it('rebuilds aggregate from persisted state', () => {
      const id = TopicLoopId.create('s1', 't1');
      const state = TopicLoopState.create({
        lastEffortAt: t1,
        lastRetrievalAt: t2,
        lastScheduledDueAt: t3,
      });
      const loop = TopicLoop.reconstitute(id, state);

      expect(loop.state.lastEffortAt).toEqual(t1);
      expect(loop.state.lastRetrievalAt).toEqual(t2);
      expect(loop.state.lastScheduledDueAt).toEqual(t3);
      expect(loop.studentId).toBe('s1');
      expect(loop.topicId).toBe('t1');
    });
  });
});
