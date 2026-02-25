/**
 * InMemoryEventStore — implements IAppendEventPort, IQueryEventsPort,
 * and IStudentEventStreamReader over a single in-memory event array.
 *
 * Used by the pipeline harness to replace real PostgreSQL without touching
 * production code paths.
 */

import type { AppendEventPayload, IAppendEventPort } from '../../application/shared/port-append-event';
import type { IQueryEventsPort, QueriedEvent, QueryEventsFilter } from '../../application/shared/port-query-events';
import type { IStudentEventStreamReader, StudentStreamedEvent } from '../../application/shared/port-student-event-stream-reader';

interface StoredEvent {
  id: string;
  studentId: string;
  eventType: string;
  topicId: string | null;
  payload: Record<string, unknown>;
  occurredAt: Date;
}

let idCounter = 0;
function nextId(): string {
  return `evt-${++idCounter}`;
}

export class InMemoryEventStore
  implements IAppendEventPort, IQueryEventsPort, IStudentEventStreamReader
{
  private events: StoredEvent[] = [];

  // ── IAppendEventPort ────────────────────────────────────────────────────────

  async append(event: AppendEventPayload): Promise<void> {
    this.events.push({
      id: nextId(),
      studentId: event.studentId,
      eventType: event.eventType,
      topicId: event.topicId,
      payload: event.payload,
      occurredAt: new Date(),
    });
  }

  /**
   * Feed a raw fixture event (has an explicit timestamp) into the store.
   * Used by the pipeline harness to inject fixture events before running handlers.
   */
  ingest(studentId: string, eventType: string, topicId: string | null, payload: Record<string, unknown>, occurredAt: Date): void {
    this.events.push({ id: nextId(), studentId, eventType, topicId, payload, occurredAt });
  }

  // ── IQueryEventsPort ────────────────────────────────────────────────────────

  async queryEvents(studentId: string, filter: QueryEventsFilter): Promise<QueriedEvent[]> {
    let results = this.events.filter((e) => e.studentId === studentId);

    if (filter.eventTypes && filter.eventTypes.length > 0) {
      results = results.filter((e) => filter.eventTypes!.includes(e.eventType));
    }
    if (filter.topicId) {
      results = results.filter((e) => e.topicId === filter.topicId);
    }
    if (filter.since) {
      results = results.filter((e) => e.occurredAt >= filter.since!);
    }

    // Sort descending (most recent first), then apply limit
    results.sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime());

    if (filter.limit !== undefined) {
      results = results.slice(0, filter.limit);
    }

    return results.map((e) => ({
      id: e.id,
      eventType: e.eventType,
      topicId: e.topicId,
      payload: e.payload,
      occurredAt: e.occurredAt,
    }));
  }

  // ── IStudentEventStreamReader ───────────────────────────────────────────────

  async readEventsForStudentInWindow(
    studentId: string,
    since: Date,
    until?: Date,
  ): Promise<StudentStreamedEvent[]> {
    return this.events
      .filter((e) => {
        if (e.studentId !== studentId) return false;
        if (e.occurredAt < since) return false;
        if (until && e.occurredAt > until) return false;
        return true;
      })
      .map((e) => ({
        eventType: e.eventType,
        topicId: e.topicId,
        occurredAt: e.occurredAt,
        payload: e.payload,
      }));
  }

  async readLatestEvent(studentId: string): Promise<StudentStreamedEvent | null> {
    const studentEvents = this.events
      .filter((e) => e.studentId === studentId)
      .sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime());

    if (studentEvents.length === 0) return null;
    const e = studentEvents[0];
    return { eventType: e.eventType, topicId: e.topicId, occurredAt: e.occurredAt, payload: e.payload };
  }

  // ── Test helpers ────────────────────────────────────────────────────────────

  getAll(): StoredEvent[] {
    return [...this.events];
  }

  clear(): void {
    this.events = [];
  }
}
