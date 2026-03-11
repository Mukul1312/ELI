import type { CohortAccessDb } from './db-types';
import type { IResolveAuthenticatedSessionPort, AuthenticatedSessionResult } from '../../application/resolve-authenticated-session/port';
import { AuthSession } from '../../domain/shared/auth-session';
import { Role } from '../../domain/shared/role';
import { AccessScope } from '../../domain/shared/access-scope';

/**
 * Combined ensure-identity + resolve-auth in a single CTE round-trip.
 *
 * Replaces the sequential:
 *   1. ProvisionStudentIdentityPg.ensureMapping()  (~250ms)
 *   2. NeonAuthResolverPg.resolve()                (~250ms)
 *
 * With a single query (~250ms total).
 */
export class ResolveAuthenticatedSessionPg implements IResolveAuthenticatedSessionPort {
  constructor(private readonly db: CohortAccessDb) {}

  async resolve(authUserId: string): Promise<AuthenticatedSessionResult | null> {
    const row = await this.db.oneOrNone<{
      id: string;
      provisioned: boolean;
      cohort_id: string | null;
      role: string | null;
    }>(
      `WITH ensure AS (
         INSERT INTO students (auth_user_id) VALUES ($1)
         ON CONFLICT (auth_user_id) DO NOTHING
         RETURNING id, true AS provisioned
       ),
       student AS (
         SELECT id, provisioned FROM ensure
         UNION ALL
         SELECT id, false AS provisioned FROM students WHERE auth_user_id = $1
         LIMIT 1
       )
       SELECT s.id, s.provisioned, scm.cohort_id, r.role
       FROM student s
       LEFT JOIN student_cohort_membership scm ON s.id = scm.student_id
       LEFT JOIN roles r ON s.id = r.student_id`,
      [authUserId],
    );

    if (!row) return null;

    const role = Role.create(row.role ?? 'student');
    const cohortId = row.cohort_id ?? null;
    const cohortIds = cohortId ? [cohortId] : [];

    const scopeValue: 'cohort' | 'global' =
      role.value === 'student'   ? 'cohort' :
      role.value === 'institute' ? 'global' :
      cohortIds.length > 0       ? 'cohort' : 'global';

    const accessScope = AccessScope.create({ cohortIds, scope: scopeValue });

    const authSession = AuthSession.create({
      studentId: row.id,
      cohortId,
      role,
      accessScope,
    });

    return { authSession, provisioned: row.provisioned };
  }
}
