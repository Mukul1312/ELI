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
 * 1. Validate session via auth.getSession() (caller passes session or we get from cookies)
 * 2. Map session.user.id (auth_user_id) -> students.id (student_id)
 * 3. Query student_cohort_membership for cohortId
 * 4. Query roles for role
 * 5. Build AuthSession
 */
export class NeonAuthResolverPg implements IResolveAuthSessionPort {
  constructor(
    private readonly db: CohortAccessDb,
    private readonly getSession: () => Promise<{ user: { id: string }; session: { userId: string } } | null>,
  ) {}

  async resolve(sessionContext: unknown): Promise<AuthSession | null> {
    const session = await this.getSession();
    if (!session?.user?.id) return null;

    const authUserId = session.user.id;

    const studentRow = await this.db.oneOrNone<{ id: string }>(
      'SELECT id FROM students WHERE auth_user_id = $1',
      [authUserId],
    );
    if (!studentRow) return null;

    const studentId = studentRow.id;

    const membershipRow = await this.db.oneOrNone<{ cohort_id: string | null }>(
      'SELECT cohort_id FROM student_cohort_membership WHERE student_id = $1',
      [studentId],
    );
    const cohortId = membershipRow?.cohort_id ?? null;

    const roleRow = await this.db.oneOrNone<{ role: string }>(
      'SELECT role FROM roles WHERE student_id = $1',
      [studentId],
    );
    const role = Role.create(roleRow?.role ?? 'student');

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
