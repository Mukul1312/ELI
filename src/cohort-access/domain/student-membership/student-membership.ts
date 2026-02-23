import {
  membershipStateFromCohortId,
  type MembershipState,
} from './value-objects';

/**
 * StudentMembership aggregate — Command Handler.
 * Enforces "exactly one active cohort or unassigned" invariant.
 * Identity: studentId (internal UUID string).
 */
export class StudentMembership {
  private constructor(
    private readonly _studentId: string,
    private _cohortId: string | null,
    private _updatedAt: Date,
  ) {}

  static create(studentId: string, cohortId: string | null, updatedAt: Date): StudentMembership {
    return new StudentMembership(studentId, cohortId ?? null, updatedAt);
  }

  static unassigned(studentId: string, updatedAt: Date): StudentMembership {
    return new StudentMembership(studentId, null, updatedAt);
  }

  get studentId(): string {
    return this._studentId;
  }

  get cohortId(): string | null {
    return this._cohortId;
  }

  get membershipState(): MembershipState {
    return membershipStateFromCohortId(this._cohortId);
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  handleAdminEnroll(cohortId: string, updatedAt: Date): void {
    this._cohortId = cohortId;
    this._updatedAt = updatedAt;
  }

  handleMembershipChangeOnRedemption(targetCohortId: string, updatedAt: Date): void {
    this._cohortId = targetCohortId;
    this._updatedAt = updatedAt;
  }
}
