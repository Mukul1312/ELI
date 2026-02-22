import type { EiDb } from '../../runtime/db';
import type { IStudentPolicyRepository } from '../../domain/student-policy/repository';
import type { StudentPolicy } from '../../domain/student-policy/student-policy';
import type { StudentPolicyId } from '../../domain/student-policy/value-objects';
import * as Q from '../../db/queries';
import { StudentPolicyMapper } from './mappers/student-policy-mapper';

export class PostgresStudentPolicyRepository implements IStudentPolicyRepository {
  constructor(private readonly db: EiDb) {}

  async findById(id: StudentPolicyId): Promise<StudentPolicy | null> {
    const row = await Q.getPolicy(this.db, id.studentId);
    return row ? StudentPolicyMapper.toDomain(row) : null;
  }

  async save(policy: StudentPolicy): Promise<void> {
    const data = StudentPolicyMapper.toPersistence(policy);
    await Q.upsertPolicy(
      this.db,
      policy.studentId,
      data.tightness_level,
      data.adjustment_mode,
      data.dials,
      data.constraints,
    );
  }
}
