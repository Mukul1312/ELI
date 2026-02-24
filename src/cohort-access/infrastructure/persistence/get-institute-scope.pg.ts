import type { CohortAccessDb } from './db-types';
import type { IGetInstituteScopePort } from '../../application/get-cohort-scope/port';
import type { CohortScopeResult } from '../../application/get-cohort-scope/port';
import { Role } from '../../domain/shared/role';
import { AccessScope } from '../../domain/shared/access-scope';

interface RoleRow {
  student_id: string;
  role: string;
  scope: string | null;
}

/**
 * MVP: Returns empty scope if roles/cohorts not yet populated.
 * Institute users are identified by student_id (same as students.id);
 * future: could have separate institute_users table.
 */
export class GetInstituteScopePg implements IGetInstituteScopePort {
  constructor(private readonly db: CohortAccessDb) {}

  async getScope(instituteUserId: string): Promise<CohortScopeResult> {
    const roleRow = await this.db.oneOrNone<RoleRow>(
      'SELECT student_id, role, scope FROM roles WHERE student_id = $1',
      [instituteUserId],
    );
    if (!roleRow) {
      return {
        cohortIds: [],
        role: Role.create('student'),
        accessScope: AccessScope.create({ cohortIds: [], scope: 'cohort' }),
      };
    }
    const role = Role.create(roleRow.role);
    // roles.scope stores a comma-separated list of cohortIds (TEXT column).
    // e.g. "uuid-1,uuid-2". NULL or empty → no cohort restriction (global for institute).
    // Schema: src/ei/db/migrate.ts `roles` table definition.
    const cohortIds = roleRow.scope ? roleRow.scope.split(',').map((s) => s.trim()).filter(Boolean) : [];
    const accessScope = AccessScope.create({
      cohortIds,
      scope: cohortIds.length > 0 ? 'cohort' : 'global',
    });
    return {
      cohortIds,
      role,
      accessScope,
    };
  }
}
