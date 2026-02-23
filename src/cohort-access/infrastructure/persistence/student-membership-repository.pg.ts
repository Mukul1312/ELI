import type { CohortAccessDb } from './db-types';
import type { IStudentMembershipRepository } from '../../domain/student-membership/repository';
import { StudentMembership } from '../../domain/student-membership/student-membership';

interface MembershipRow {
  student_id: string;
  cohort_id: string | null;
  updated_at: Date;
}

export class StudentMembershipRepositoryPg implements IStudentMembershipRepository {
  constructor(private readonly db: CohortAccessDb) {}

  async findByStudentId(studentId: string): Promise<StudentMembership | null> {
    const row = await this.db.oneOrNone<MembershipRow>(
      'SELECT student_id, cohort_id, updated_at FROM student_cohort_membership WHERE student_id = $1',
      [studentId],
    );
    if (!row) return null;
    return StudentMembership.create(row.student_id, row.cohort_id, row.updated_at);
  }

  async save(membership: StudentMembership): Promise<void> {
    await this.db.none(
      `INSERT INTO student_cohort_membership (student_id, cohort_id, updated_at)
       VALUES ($1, $2, $3)
       ON CONFLICT (student_id) DO UPDATE SET cohort_id = $2, updated_at = $3`,
      [membership.studentId, membership.cohortId, membership.updatedAt],
    );
  }
}
