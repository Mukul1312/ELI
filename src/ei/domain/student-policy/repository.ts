import type { StudentPolicy } from './student-policy';
import type { StudentPolicyId } from './value-objects';

export interface IStudentPolicyRepository {
  findById(id: StudentPolicyId): Promise<StudentPolicy | null>;
  save(policy: StudentPolicy): Promise<void>;
}
