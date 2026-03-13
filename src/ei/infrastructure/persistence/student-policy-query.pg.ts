/**
 * PostgresStudentPolicyQueryAdapter — implements IStudentPolicyQuery.
 * Driven adapter for SSO flow selection policy queries.
 *
 * Per tactical spec §8: wraps existing Q.getPolicy().
 * Maps PolicyRow.dials (Record<string, unknown>) → Record<string, boolean> for cohort flags.
 */

import type { EiDb } from '../../runtime/db';
import type {
  IStudentPolicyQuery,
  StudentPolicyForFlow,
} from '../../study-session-orchestration/application/shared/port-student-policy-query';
import { getPolicy } from '../../db/queries';

export class PostgresStudentPolicyQueryAdapter implements IStudentPolicyQuery {
  constructor(private readonly db: EiDb) {}

  async getPolicyForFlow(studentId: string): Promise<StudentPolicyForFlow | null> {
    const row = await getPolicy(this.db, studentId);
    if (!row) return null;

    // Map dials from Record<string, unknown> → Record<string, boolean>
    const dials: Record<string, boolean> = {};
    if (row.dials && typeof row.dials === 'object') {
      for (const [key, value] of Object.entries(row.dials)) {
        if (typeof value === 'boolean') {
          dials[key] = value;
        }
      }
    }

    return { dials };
  }
}
