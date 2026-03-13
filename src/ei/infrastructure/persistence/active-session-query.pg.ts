/**
 * PostgresActiveSessionQueryAdapter — implements IActiveSessionQuery.
 * Driven adapter for resume detection projection queries.
 *
 * Per ADR-005 §C3: wraps existing Q.getActiveSessionForStudent()
 * and Q.countStudentEventsLast7d().
 */

import type { EiDb } from '../../runtime/db';
import type {
  IActiveSessionQuery,
  ActiveSessionState,
} from '../../study-session-orchestration/application/shared/port-active-session-query';
import { getActiveSessionForStudent, countStudentEventsLast7d } from '../../db/queries';

export class PostgresActiveSessionQueryAdapter implements IActiveSessionQuery {
  constructor(private readonly db: EiDb) {}

  async getActiveSession(studentId: string): Promise<ActiveSessionState | null> {
    const row = await getActiveSessionForStudent(this.db, studentId);
    if (!row) return null;

    return {
      topicId: row.topic_id,
      topicName: row.topic_name,
      sessionPhase: row.session_phase,
      currentSessionId: row.current_session_id,
      lastSessionStartedAt: row.last_session_started_at,
    };
  }

  async getStudentEventCounts7d(
    studentId: string,
  ): Promise<{ sessionsLast7d: number; loopsClosedLast7d: number }> {
    return countStudentEventsLast7d(this.db, studentId);
  }
}
