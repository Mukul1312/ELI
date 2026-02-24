import type { StudentMembership } from './student-membership';
import type { StudentId } from '../shared/ids';

export interface IStudentMembershipRepository {
  findByStudentId(studentId: StudentId): Promise<StudentMembership | null>;
  save(membership: StudentMembership): Promise<void>;
}
