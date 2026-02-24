import type { StudentId } from '../../domain/shared/ids';
import type { CohortId } from '../../domain/shared/ids';
import type { Role } from '../../domain/shared/role';

export interface ChangeStudentMembershipCommand {
  studentId: StudentId;
  targetCohortId: CohortId;
  source: 'admin' | 'redemption';
  /** Role of the caller — required. AdminEnroll is rejected unless callerRole is 'admin'. */
  callerRole: Role;
  idempotencyKey?: string;
}
