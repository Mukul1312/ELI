import type {
  IChangeStudentMembershipUseCase,
  IIdempotencyKeyStore,
  ChangeStudentMembershipCommand,
} from './port';
import type { IStudentMembershipRepository } from '../../domain/student-membership/repository';
import {
  StudentMembership,
} from '../../domain/student-membership/student-membership';
import { MissingStudentIdError } from '../../domain/student-membership/errors';

export class ChangeStudentMembershipHandler implements IChangeStudentMembershipUseCase {
  constructor(
    private readonly membershipRepo: IStudentMembershipRepository,
    private readonly idempotencyStore: IIdempotencyKeyStore,
  ) {}

  async execute(command: ChangeStudentMembershipCommand): Promise<StudentMembership> {
    const { studentId, targetCohortId, source, idempotencyKey } = command;
    if (!studentId?.trim()) {
      throw new MissingStudentIdError();
    }
    if (!targetCohortId?.trim()) {
      throw new Error('targetCohortId is required');
    }

    if (source === 'redemption' && idempotencyKey) {
      const result = await this.idempotencyStore.checkAndRecord(idempotencyKey, targetCohortId);
      if (result.exists) {
        const existing = await this.membershipRepo.findByStudentId(studentId);
        if (existing) return existing;
        const membership = StudentMembership.create(studentId, result.cohortId, new Date());
        await this.membershipRepo.save(membership);
        return membership;
      }
    }

    let membership = await this.membershipRepo.findByStudentId(studentId);
    const now = new Date();
    if (!membership) {
      membership = StudentMembership.unassigned(studentId, now);
    }

    if (source === 'admin') {
      membership.handleAdminEnroll(targetCohortId, now);
    } else {
      membership.handleMembershipChangeOnRedemption(targetCohortId, now);
    }

    await this.membershipRepo.save(membership);
    return membership;
  }
}
