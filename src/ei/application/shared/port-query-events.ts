/**
 * IQueryEventsPort — driven port for querying historical events from the Ledger.
 * Used by P2 and P3 gate use cases to fetch cross-protocol session events.
 * Per ei-runtime-tactical-spec.md §8 (Ports).
 */

export interface QueriedEvent {
  id: string;
  eventType: string;
  topicId: string | null;
  payload: Record<string, unknown>;
  occurredAt: Date;
}

export interface QueryEventsFilter {
  eventTypes?: string[];
  topicId?: string;
  since?: Date;
  limit?: number;
}

export interface IQueryEventsPort {
  queryEvents(studentId: string, filter: QueryEventsFilter): Promise<QueriedEvent[]>;

  /**
   * Targeted single-event lookup by sessionId + eventType.
   * Uses JSONB index on ei_events.payload->>'sessionId' (ADR-004 C1).
   * Returns the most recent matching event, or null.
   */
  queryBySessionId(sessionId: string, eventType: string): Promise<QueriedEvent | null>;
}
