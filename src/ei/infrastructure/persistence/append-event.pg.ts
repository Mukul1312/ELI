/**
 * PostgresAppendEventAdapter — implements IAppendEventPort using ei_events table.
 * Driven adapter for the Ledger write side.
 * Per ei-runtime-tactical-spec.md §8 (Ports) and Hexagonal architecture.
 */

import type { EiDb } from '../../runtime/db';
import type { IAppendEventPort, AppendEventPayload } from '../../application/shared/port-append-event';
import { insertEvent } from '../../db/queries';

export class PostgresAppendEventAdapter implements IAppendEventPort {
  constructor(private readonly db: EiDb) {}

  async append(event: AppendEventPayload): Promise<void> {
    await insertEvent(
      this.db,
      event.studentId,
      event.eventType,
      event.topicId,
      event.payload,
    );
  }
}
