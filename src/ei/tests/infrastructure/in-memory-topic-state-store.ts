/**
 * InMemoryTopicStateStore — implements ITopicStateReader.
 *
 * Simulates the TopicLoop projection: processes domain events and maintains
 * per-topic last_effort_at / last_retrieval_at / last_scheduled_due_at using
 * GREATEST (monotonic) semantics.
 */

import type { ITopicStateReader, TopicStateSnapshot } from '../../application/shared/port-topic-state-reader';

interface MutableTopicState {
  topicId: string;
  lastEffortAt: Date | null;
  lastRetrievalAt: Date | null;
  lastScheduledDueAt: Date | null;
}

function maxDate(a: Date | null, b: Date | null): Date | null {
  if (!a) return b;
  if (!b) return a;
  return a > b ? a : b;
}

export class InMemoryTopicStateStore implements ITopicStateReader {
  private store = new Map<string, MutableTopicState>();

  /**
   * Apply a domain event to update per-topic timestamps.
   * Mirrors TopicLoop aggregate's event-application rules.
   */
  applyEvent(eventType: string, topicId: string | null, payload: Record<string, unknown>): void {
    if (!topicId) return;

    const existing = this.store.get(topicId) ?? {
      topicId,
      lastEffortAt: null,
      lastRetrievalAt: null,
      lastScheduledDueAt: null,
    };

    switch (eventType) {
      case 'SessionEnd': {
        const endedAt = payload.endedAt ? new Date(payload.endedAt as string) : null;
        existing.lastEffortAt = maxDate(existing.lastEffortAt, endedAt);
        break;
      }
      case 'RetrievalVerified': {
        const verifiedAt = payload.verifiedAt ? new Date(payload.verifiedAt as string) : null;
        existing.lastRetrievalAt = maxDate(existing.lastRetrievalAt, verifiedAt);
        break;
      }
      case 'VerificationCompleted': {
        const completedAt = payload.completedAt ? new Date(payload.completedAt as string) : null;
        existing.lastRetrievalAt = maxDate(existing.lastRetrievalAt, completedAt);
        break;
      }
      case 'RetrievalScheduled': {
        const dueAt = payload.dueAt ? new Date(payload.dueAt as string) : null;
        existing.lastScheduledDueAt = maxDate(existing.lastScheduledDueAt, dueAt);
        break;
      }
      default:
        break;
    }

    this.store.set(topicId, existing);
  }

  // ── ITopicStateReader ───────────────────────────────────────────────────────

  async getAllTopicStates(_studentId: string): Promise<TopicStateSnapshot[]> {
    return [...this.store.values()].map((s) => ({
      topicId: s.topicId,
      lastEffortAt: s.lastEffortAt,
      lastRetrievalAt: s.lastRetrievalAt,
      lastScheduledDueAt: s.lastScheduledDueAt,
    }));
  }

  // ── Test helpers ────────────────────────────────────────────────────────────

  clear(): void {
    this.store.clear();
  }
}
