import type { CohortId } from '../shared/ids';

export type MembershipState = 'active' | 'unassigned';

export function membershipStateFromCohortId(cohortId: CohortId | null): MembershipState {
  return cohortId !== null ? 'active' : 'unassigned';
}
