import { describe, it, expect } from 'vitest';
import { StudentMembership } from '../../../domain/student-membership/student-membership';
import { StudentId, CohortId } from '../../../domain/shared/ids';
import { DomainError } from '../../../domain/shared/errors';

describe('StudentId / CohortId', () => {
  it('StudentId.create throws DomainError for empty string', () => {
    expect(() => StudentId.create('')).toThrow(DomainError);
    expect(() => StudentId.create('   ')).toThrow(DomainError);
  });

  it('CohortId.create throws DomainError for empty string', () => {
    expect(() => CohortId.create('')).toThrow(DomainError);
  });

  it('StudentId.equals returns true for same value', () => {
    const a = StudentId.create('student-123');
    const b = StudentId.create('student-123');
    expect(a.equals(b)).toBe(true);
  });

  it('StudentId.equals returns false for different values', () => {
    const a = StudentId.create('student-123');
    const b = StudentId.create('student-456');
    expect(a.equals(b)).toBe(false);
  });
});

describe('StudentMembership', () => {
  const studentId = StudentId.create('student-123');
  const cohortId = CohortId.create('cohort-456');
  const now = new Date('2025-01-15T10:00:00Z');

  it('first enrollment: unassigned to active', () => {
    const membership = StudentMembership.unassigned(studentId, now);
    expect(membership.membershipState).toBe('unassigned');
    expect(membership.cohortId).toBeNull();

    membership.handleAdminEnroll(cohortId, now);
    expect(membership.membershipState).toBe('active');
    expect(membership.cohortId?.value).toBe('cohort-456');
  });

  it('MembershipChangeOnRedemption sets cohort', () => {
    const membership = StudentMembership.unassigned(studentId, now);
    membership.handleMembershipChangeOnRedemption(cohortId, now);
    expect(membership.membershipState).toBe('active');
    expect(membership.cohortId?.value).toBe('cohort-456');
  });

  it('studentId getter returns StudentId VO', () => {
    const membership = StudentMembership.unassigned(studentId, now);
    expect(membership.studentId.value).toBe('student-123');
  });
});
