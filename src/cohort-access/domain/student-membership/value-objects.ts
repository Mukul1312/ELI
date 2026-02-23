export type MembershipState = 'active' | 'unassigned';

export function membershipStateFromCohortId(cohortId: string | null): MembershipState {
  return cohortId ? 'active' : 'unassigned';
}
