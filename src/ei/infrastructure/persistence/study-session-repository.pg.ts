import type { EiDb } from '../../runtime/db';
import type { IStudySessionRepository } from '../../domain/study-session/repository';
import { StudySession } from '../../domain/study-session/study-session';

const SESSION_EVENT_TYPES = [
  'SessionIntentIssued', 'ActivationPlanIssued', 'VerificationDecisionIssued',
];

export class PostgresStudySessionRepository implements IStudySessionRepository {
  constructor(private readonly db: EiDb) {}

  async findById(sessionId: string): Promise<StudySession | null> {
    // Uses JSONB functional index idx_ei_events_session_id
    const rows = await this.db.any(
      `SELECT event_type, payload, occurred_at FROM ei_events
       WHERE payload->>'sessionId' = $1 AND event_type = ANY($2)
       ORDER BY occurred_at ASC`,
      [sessionId, SESSION_EVENT_TYPES],
    );
    if (rows.length === 0) return null;
    return StudySession.fold(
      rows.map((r: any) => ({
        eventType: r.event_type,
        payload: r.payload,
        occurredAt: r.occurred_at,
      })),
    );
  }

  async save(_session: StudySession): Promise<void> {
    // No-op: events already appended via IAppendEventPort in gate handlers.
    // StudySession is event-sourced; persistence is handled by the event ledger.
  }
}
