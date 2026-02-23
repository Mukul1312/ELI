import type { StudentMembership } from './student-membership';

export interface IStudentMembershipRepository {
  findByStudentId(studentId: string): Promise<StudentMembership | null>;
  save(membership: StudentMembership): Promise<void>;
}
