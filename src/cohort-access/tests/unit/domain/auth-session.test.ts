import { describe, it, expect } from 'vitest';
import { AuthSession } from '../../../domain/shared/auth-session';
import { Role } from '../../../domain/shared/role';
import { AccessScope } from '../../../domain/shared/access-scope';
import { InvalidAuthSessionError } from '../../../domain/shared/auth-session';

describe('AuthSession', () => {
  const validProps = {
    studentId: 'student-123',
    cohortId: 'cohort-456',
    role: Role.create('student'),
    accessScope: AccessScope.create({ cohortIds: ['cohort-456'], scope: 'cohort' }),
  };

  it('throws InvalidAuthSessionError when studentId is empty', () => {
    expect(() =>
      AuthSession.create({
        ...validProps,
        studentId: '',
      }),
    ).toThrow(InvalidAuthSessionError);
    expect(() =>
      AuthSession.create({
        ...validProps,
        studentId: '   ',
      }),
    ).toThrow(InvalidAuthSessionError);
  });

  it('creates valid AuthSession', () => {
    const session = AuthSession.create(validProps);
    expect(session.studentId).toBe('student-123');
    expect(session.cohortId).toBe('cohort-456');
    expect(session.role.value).toBe('student');
    expect(session.accessScope.cohortIds).toEqual(['cohort-456']);
  });

  it('equals returns true for same values', () => {
    const a = AuthSession.create(validProps);
    const b = AuthSession.create(validProps);
    expect(a.equals(b)).toBe(true);
  });

  it('equals returns false for different studentId', () => {
    const a = AuthSession.create(validProps);
    const b = AuthSession.create({ ...validProps, studentId: 'other' });
    expect(a.equals(b)).toBe(false);
  });
});
