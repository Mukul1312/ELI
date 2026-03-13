import type { PostgresStore } from '@mastra/pg';
import * as Q from '../../db/queries';
import type {
  IStudentEventStreamReader,
  StudentStreamedEvent,
} from '../../application/shared/port-student-event-stream-reader';

type DbClient = PostgresStore['db'];

export class PostgresStudentEventStreamReader implements IStudentEventStreamReader {
  constructor(private readonly db: DbClient) {}

  async readEventsForStudentInWindow(
    studentId: string,
    since: Date,
    until?: Date,
  ): Promise<StudentStreamedEvent[]> {
    const rows = await Q.queryEvents(this.db, studentId, { since, until });
    return rows.map(toSnapshot);
  }

  async readLatestEvent(studentId: string): Promise<StudentStreamedEvent | null> {
    const rows = await Q.queryEvents(this.db, studentId, { limit: 1 });
    return rows.length > 0 ? toSnapshot(rows[0]) : null;
  }

  async hasEventOfType(studentId: string, eventType: string): Promise<boolean> {
    const rows = await Q.queryEvents(this.db, studentId, { eventTypes: [eventType], limit: 1 });
    return rows.length > 0;
  }

  async readLatestEventOfType(studentId: string, eventType: string): Promise<StudentStreamedEvent | null> {
    const rows = await Q.queryEvents(this.db, studentId, { eventTypes: [eventType], limit: 1 });
    return rows.length > 0 ? toSnapshot(rows[0]) : null;
  }
}

function toSnapshot(row: Q.StoredEventRow): StudentStreamedEvent {
  return {
    eventType: row.event_type,
    topicId: row.topic_id,
    occurredAt: row.occurred_at instanceof Date ? row.occurred_at : new Date(row.occurred_at),
    payload: row.payload,
  };
}
