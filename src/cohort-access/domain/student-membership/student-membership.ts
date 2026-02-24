import { StudentId, CohortId } from '../shared/ids';
import {
  membershipStateFromCohortId,
  type MembershipState,
} from './value-objects';

/**
 * StudentMembership aggregate — Command Handler.
 * Enforces "exactly one active cohort or unassigned" invariant.
 * Identity: studentId (StudentId VO wrapping internal UUID).
 */
export class StudentMembership {
  private constructor(
    private readonly _studentId: StudentId,
    private _cohortId: CohortId | null,
    private _updatedAt: Date,
  ) {}

  static create(studentId: StudentId, cohortId: CohortId | null, updatedAt: Date): StudentMembership {
    return new StudentMembership(studentId, cohortId, updatedAt);
  }

  static unassigned(studentId: StudentId, updatedAt: Date): StudentMembership {
    return new StudentMembership(studentId, null, updatedAt);
  }

  get studentId(): StudentId {
    return this._studentId;
  }

  get cohortId(): CohortId | null {
    return this._cohortId;
  }

  get membershipState(): MembershipState {
    return membershipStateFromCohortId(this._cohortId);
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  handleAdminEnroll(cohortId: CohortId, updatedAt: Date): void {
    this._cohortId = cohortId;
    this._updatedAt = updatedAt;
  }

  handleMembershipChangeOnRedemption(targetCohortId: CohortId, updatedAt: Date): void {
    this._cohortId = targetCohortId;
    this._updatedAt = updatedAt;
  }
}
