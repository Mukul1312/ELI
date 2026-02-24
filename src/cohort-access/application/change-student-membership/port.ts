import type { StudentMembership } from '../../domain/student-membership/student-membership';
import type { ChangeStudentMembershipCommand } from './command';

export type { ChangeStudentMembershipCommand };

export interface IChangeStudentMembershipUseCase {
  execute(command: ChangeStudentMembershipCommand): Promise<StudentMembership>;
}

export interface IIdempotencyKeyStore {
  /**
   * Check if key exists. Returns { exists: true, cohortId } if key exists,
   * { exists: false } if first use. Rejects (throws IdempotencyKeyConflictError)
   * if key exists with different cohortId.
   */
  checkAndRecord(key: string, cohortId: string): Promise<{ exists: true; cohortId: string } | { exists: false }>;
}
