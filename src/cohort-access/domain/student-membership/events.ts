/**
 * Domain events for StudentMembership.
 * Optional for v1; state table is source of truth.
 */

export interface MembershipChangedPayload {
  studentId: string;
  cohortId: string | null;
  changedAt: string;
  source: 'admin' | 'redemption';
}
