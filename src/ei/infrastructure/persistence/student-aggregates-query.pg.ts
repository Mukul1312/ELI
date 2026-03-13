/**
 * PostgresStudentAggregatesQueryAdapter — implements IStudentAggregatesQuery.
 * Driven adapter for SSO flow selection projection queries.
 *
 * Per tactical spec §8: wraps existing Q.getAggregates().
 * Returns domain-shaped StudentAggregatesForFlow from AggregatesRow.
 */

import type { EiDb } from '../../runtime/db';
import type {
  IStudentAggregatesQuery,
  StudentAggregatesForFlow,
} from '../../study-session-orchestration/application/shared/port-student-aggregates-query';
import { getAggregates, getCheckinEventContext } from '../../db/queries';

export class PostgresStudentAggregatesQueryAdapter implements IStudentAggregatesQuery {
  constructor(private readonly db: EiDb) {}

  async getAggregatesForFlow(studentId: string): Promise<StudentAggregatesForFlow | null> {
    const row = await getAggregates(this.db, studentId);
    if (!row) return null;

    // sessionsTotal not in AggregatesRow — load from getCheckinEventContext
    const eventCtx = await getCheckinEventContext(this.db, studentId);

    return {
      sessionsTotal: eventCtx.sessionsTotal,
      silenceDays: row.silence_days,
      pendingChecks: row.pending_checks,
      openLoops: row.open_loops,
    };
  }
}
