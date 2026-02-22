import type { EiDb } from '../../runtime/db';
import type { IEventStreamReader, StreamedEvent } from '../../application/shared/port-event-stream-reader';
import { queryEvents } from '../../db/queries';
import { TOPIC_LOOP_EVENT_TYPES } from '../../domain/topic-loop/events';

export class PostgresEventStreamReader implements IEventStreamReader {
  constructor(private readonly db: EiDb) {}

  async readEventsForTopic(
    studentId: string,
    topicId: string,
  ): Promise<StreamedEvent[]> {
    const rows = await queryEvents(this.db, studentId, {
      topicId,
      eventTypes: [...TOPIC_LOOP_EVENT_TYPES],
    });

    // queryEvents returns DESC; reverse to ASC for chronological replay
    return rows.reverse().map((row) => ({
      eventType: row.event_type,
      payload: row.payload,
      occurredAt: row.occurred_at,
    }));
  }
}
