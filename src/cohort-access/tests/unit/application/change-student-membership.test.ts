import { describe, it, expect } from 'vitest';
import { ChangeStudentMembershipHandler } from '../../../application/change-student-membership/handler';
import { StudentMembership } from '../../../domain/student-membership/student-membership';
import { MissingStudentIdError } from '../../../domain/student-membership/errors';
import { IdempotencyKeyConflictError } from '../../../domain/student-membership/errors';

describe('ChangeStudentMembershipHandler', () => {
  const studentId = 'student-123';
  const cohortId = 'cohort-456';

  it('rejects when studentId is missing', async () => {
    const membershipRepo = {
      findByStudentId: async () => null,
      save: async () => {},
    };
    const idempotencyStore = {
      checkAndRecord: async () => ({ exists: false as const }),
    };
    const handler = new ChangeStudentMembershipHandler(membershipRepo as any, idempotencyStore as any);
    await expect(
      handler.execute({
        studentId: '',
        targetCohortId: cohortId,
        source: 'admin',
      }),
    ).rejects.toThrow(MissingStudentIdError);
  });

  it('duplicate idempotency key + same cohort: no-op, returns existing state', async () => {
    const existingMembership = StudentMembership.create(studentId, cohortId, new Date());
    const membershipRepo = {
      findByStudentId: async () => existingMembership,
      save: async () => {},
    };
    const idempotencyStore = {
      checkAndRecord: async () => ({ exists: true as const, cohortId }),
    };
    const handler = new ChangeStudentMembershipHandler(membershipRepo as any, idempotencyStore as any);
    const result = await handler.execute({
      studentId,
      targetCohortId: cohortId,
      source: 'redemption',
      idempotencyKey: 'redemption-1',
    });
    expect(result.cohortId).toBe(cohortId);
    expect(result.membershipState).toBe('active');
  });

  it('conflicting idempotency key: rejects', async () => {
    const membershipRepo = {
      findByStudentId: async () => null,
      save: async () => {},
    };
    const idempotencyStore = {
      checkAndRecord: async () => {
        throw new IdempotencyKeyConflictError('key', 'old-cohort', cohortId);
      },
    };
    const handler = new ChangeStudentMembershipHandler(membershipRepo as any, idempotencyStore as any);
    await expect(
      handler.execute({
        studentId,
        targetCohortId: cohortId,
        source: 'redemption',
        idempotencyKey: 'redemption-1',
      }),
    ).rejects.toThrow(IdempotencyKeyConflictError);
  });
});
