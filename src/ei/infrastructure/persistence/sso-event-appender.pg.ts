/**
 * PostgresSsoEventAppenderAdapter — implements IEventAppender for SSO.
 * Driven adapter for appending SSO domain events to the shared EI Event Ledger.
 *
 * Per tactical spec §8: wraps existing insertEvent().
 * Delegates to the same Ledger append path as IAppendEventPort.
 */

import type { EiDb } from '../../runtime/db';
import type { IEventAppender, SsoEventPayload } from '../../study-session-orchestration/application/shared/port-event-appender';
import { insertEvent } from '../../db/queries';

export class PostgresSsoEventAppenderAdapter implements IEventAppender {
  constructor(private readonly db: EiDb) {}

  async append(event: SsoEventPayload): Promise<void> {
    await insertEvent(
      this.db,
      event.studentId,
      event.eventType,
      event.topicId,
      event.payload,
      undefined,
      event.idempotencyKey,
    );
  }
}
