/**
 * LedgerTimelineAdapter — implements IQueryEventsPort and IGetStudentAggregatesPort
 * using ei Ledger (ei_events, ei_student_aggregates).
 * Driven adapter for Ops GetStudentTimeline use case.
 * Per ops-observability-tactical-spec.md and Hexagonal architecture.
 */

import type { EiDb } from '@/ei/runtime/db';
import type { IQueryEventsPort, QueryEventsFilter, QueriedEvent } from '@/ei/application/shared/port-query-events';
import type { IGetStudentAggregatesPort, StudentAggregatesRow } from '@/ops/application/get-student-timeline/port';
import { queryEvents, getAggregates } from '@/ei/db/queries';

export class LedgerTimelineAdapter implements IQueryEventsPort, IGetStudentAggregatesPort {
  constructor(private readonly db: EiDb) {}

  async queryEvents(studentId: string, filter: QueryEventsFilter): Promise<QueriedEvent[]> {
    const rows = await queryEvents(this.db, studentId, {
      eventTypes: filter.eventTypes,
      topicId: filter.topicId,
      since: filter.since,
      limit: filter.limit,
    });
    return rows.map((row) => ({
      id: row.id,
      eventType: row.event_type,
      topicId: row.topic_id,
      payload: row.payload,
      occurredAt: row.occurred_at,
    }));
  }

  async getStudentAggregates(studentId: string): Promise<StudentAggregatesRow | null> {
    return getAggregates(this.db, studentId);
  }
}
