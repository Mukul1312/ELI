import { describe, it, expect } from 'vitest';
import { StudentMembership } from '../../../domain/student-membership/student-membership';

describe('StudentMembership', () => {
  const studentId = 'student-123';
  const cohortId = 'cohort-456';
  const now = new Date('2025-01-15T10:00:00Z');

  it('first enrollment: unassigned to active', () => {
    const membership = StudentMembership.unassigned(studentId, now);
    expect(membership.membershipState).toBe('unassigned');
    expect(membership.cohortId).toBeNull();

    membership.handleAdminEnroll(cohortId, now);
    expect(membership.membershipState).toBe('active');
    expect(membership.cohortId).toBe(cohortId);
  });

  it('MembershipChangeOnRedemption sets cohort', () => {
    const membership = StudentMembership.unassigned(studentId, now);
    membership.handleMembershipChangeOnRedemption(cohortId, now);
    expect(membership.membershipState).toBe('active');
    expect(membership.cohortId).toBe(cohortId);
  });
});
