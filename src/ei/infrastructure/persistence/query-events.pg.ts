/**
 * PostgresQueryEventsAdapter — implements IQueryEventsPort using ei_events table.
 * Driven adapter for historical event reads (cross-protocol constraints).
 * Per ei-runtime-tactical-spec.md §8 (Ports) and Hexagonal architecture.
 */

import type { EiDb } from '../../runtime/db';
import type { IQueryEventsPort, QueryEventsFilter, QueriedEvent } from '../../application/shared/port-query-events';
import { queryEvents } from '../../db/queries';

export class PostgresQueryEventsAdapter implements IQueryEventsPort {
  constructor(private readonly db: EiDb) {}

  async queryEvents(studentId: string, filter: QueryEventsFilter): Promise<QueriedEvent[]> {
    const rows = await queryEvents(this.db, studentId, {
      eventTypes: filter.eventTypes,
      topicId: filter.topicId,
      since: filter.since,
      limit: filter.limit,
    });

    return rows.map(row => ({
      id: row.id,
      eventType: row.event_type,
      topicId: row.topic_id,
      payload: row.payload,
      occurredAt: row.occurred_at,
    }));
  }
}
