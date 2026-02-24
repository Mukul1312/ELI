import { describe, it, expect } from 'vitest';
import { ChangeStudentMembershipHandler } from '../../../application/change-student-membership/handler';
import { StudentMembership } from '../../../domain/student-membership/student-membership';
import { StudentId, CohortId } from '../../../domain/shared/ids';
import { Role } from '../../../domain/shared/role';
import { IdempotencyKeyConflictError, UnauthorizedMembershipChangeError } from '../../../domain/student-membership/errors';
import type { IStudentMembershipRepository } from '../../../domain/student-membership/repository';
import type { IIdempotencyKeyStore } from '../../../application/change-student-membership/port';

describe('ChangeStudentMembershipHandler', () => {
  const studentId = StudentId.create('student-123');
  const cohortId = CohortId.create('cohort-456');
  const adminRole = Role.create('admin');
  const studentRole = Role.create('student');

  const makeRepo = (existing: StudentMembership | null): IStudentMembershipRepository => ({
    findByStudentId: async () => existing,
    save: async () => {},
  });

  const makeIdempStore = (
    result: Awaited<ReturnType<IIdempotencyKeyStore['checkAndRecord']>> | 'throw',
  ): IIdempotencyKeyStore => ({
    checkAndRecord: async () => {
      if (result === 'throw') {
        throw new IdempotencyKeyConflictError('key', 'old-cohort', cohortId.value);
      }
      return result;
    },
  });

  it('rejects admin enrollment when callerRole is not admin', async () => {
    const handler = new ChangeStudentMembershipHandler(
      makeRepo(null),
      makeIdempStore({ exists: false }),
    );
    await expect(
      handler.execute({
        studentId,
        targetCohortId: cohortId,
        source: 'admin',
        callerRole: studentRole,
      }),
    ).rejects.toThrow(UnauthorizedMembershipChangeError);
  });

  it('admin source with admin role: enrolls successfully', async () => {
    const handler = new ChangeStudentMembershipHandler(
      makeRepo(null),
      makeIdempStore({ exists: false }),
    );
    const result = await handler.execute({
      studentId,
      targetCohortId: cohortId,
      source: 'admin',
      callerRole: adminRole,
    });
    expect(result.cohortId?.value).toBe(cohortId.value);
    expect(result.membershipState).toBe('active');
  });

  it('duplicate idempotency key + same cohort: no-op, returns existing state', async () => {
    const existingMembership = StudentMembership.create(studentId, cohortId, new Date());
    const handler = new ChangeStudentMembershipHandler(
      makeRepo(existingMembership),
      makeIdempStore({ exists: true, cohortId: cohortId.value }),
    );
    const result = await handler.execute({
      studentId,
      targetCohortId: cohortId,
      source: 'redemption',
      callerRole: studentRole,
      idempotencyKey: 'redemption-1',
    });
    expect(result.cohortId?.value).toBe(cohortId.value);
    expect(result.membershipState).toBe('active');
  });

  it('conflicting idempotency key: rejects with IdempotencyKeyConflictError', async () => {
    const handler = new ChangeStudentMembershipHandler(
      makeRepo(null),
      makeIdempStore('throw'),
    );
    await expect(
      handler.execute({
        studentId,
        targetCohortId: cohortId,
        source: 'redemption',
        callerRole: studentRole,
        idempotencyKey: 'redemption-1',
      }),
    ).rejects.toThrow(IdempotencyKeyConflictError);
  });
});
