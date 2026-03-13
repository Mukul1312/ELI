import type { CohortAccessDb } from '../persistence/db-types';
import type { IResolveAuthSessionPort } from '../../application/resolve-auth-session/port';
import type { AuthSession } from '../../domain/shared/auth-session';
import { AuthSession as AuthSessionVO } from '../../domain/shared/auth-session';
import { Role } from '../../domain/shared/role';
import { AccessScope } from '../../domain/shared/access-scope';

/**
 * Resolves Neon Auth session to AuthSession.
 * Requires @neondatabase/auth to be installed and createAuthClient() in lib/auth/client.ts.
 *
 * Flow:
 * 1. Map session.user.id (auth_user_id) -> students.id (student_id)
 * 2. Query student_cohort_membership for cohortId
 * 3. Query roles for role
 * 4. Build AuthSession
 */
export class NeonAuthResolverPg implements IResolveAuthSessionPort {
  constructor(private readonly db: CohortAccessDb) {}

  async resolve(sessionContextUser: { id: string } | null): Promise<AuthSession | null> {
    if (!sessionContextUser?.id) return null;

    const authUserId = sessionContextUser.id;

    // Single query joining students, cohort membership, and roles
    const row = await this.db.oneOrNone<{ id: string; cohort_id: string | null; role: string | null }>(
      `SELECT
         s.id,
         scm.cohort_id,
         r.role
       FROM students s
       LEFT JOIN student_cohort_membership scm ON s.id = scm.student_id
       LEFT JOIN roles r ON s.id = r.student_id
       WHERE s.auth_user_id = $1`,
      [authUserId],
    );

    if (!row) return null;

    const studentId = row.id;
    const cohortId = row.cohort_id ?? null;
    const role = Role.create(row.role ?? 'student');

    const cohortIds = cohortId ? [cohortId] : [];
    // Scope is role-aware:
    // - student: always 'cohort' (empty cohortIds = no access; never global)
    // - institute: always 'global' (cross-cohort visibility by design)
    // - admin: 'cohort' if assigned to specific cohorts, else 'global'
    const scopeValue: 'cohort' | 'global' =
      role.value === 'student'   ? 'cohort' :
      role.value === 'institute' ? 'global' :
      cohortIds.length > 0       ? 'cohort' : 'global'; // admin
    const accessScope = AccessScope.create({ cohortIds, scope: scopeValue });

    return AuthSessionVO.create({
      studentId,
      cohortId,
      role,
      accessScope,
    });
  }
}
