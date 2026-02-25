import type { CohortAccessDb } from './db-types';
import type {
  IProvisionStudentIdentityPort,
  ProvisionResult,
} from '../../application/ensure-student-identity/port';

/** PostgreSQL unique violation error code */
const PG_UNIQUE_VIOLATION = '23505';

/**
 * Ensures a students row exists for the given auth_user_id.
 * Race-safe: check-then-insert with conflict handling.
 * Does NOT create student_cohort_membership or roles; enrollment is separate.
 */
export class ProvisionStudentIdentityPg implements IProvisionStudentIdentityPort {
  constructor(private readonly db: CohortAccessDb) {}

  async ensureMapping(authUserId: string): Promise<ProvisionResult> {
    const existing = await this.db.oneOrNone<{ id: string }>(
      'SELECT id FROM students WHERE auth_user_id = $1',
      [authUserId],
    );
    if (existing) {
      return { studentId: existing.id, provisioned: false };
    }

    try {
      const row = await this.db.one<{ id: string }>(
        'INSERT INTO students (auth_user_id) VALUES ($1) RETURNING id',
        [authUserId],
      );
      return { studentId: row.id, provisioned: true };
    } catch (err) {
      const code = (err as { code?: string })?.code;
      if (code === PG_UNIQUE_VIOLATION) {
        const row = await this.db.one<{ id: string }>(
          'SELECT id FROM students WHERE auth_user_id = $1',
          [authUserId],
        );
        return { studentId: row.id, provisioned: false };
      }
      throw err;
    }
  }
}
