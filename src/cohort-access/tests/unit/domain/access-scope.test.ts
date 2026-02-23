import { describe, it, expect } from 'vitest';
import { AccessScope } from '../../../domain/shared/access-scope';
import { InvalidAccessScopeError } from '../../../domain/shared/access-scope';

describe('AccessScope', () => {
  it('throws InvalidAccessScopeError when cohortIds is not an array', () => {
    expect(() =>
      AccessScope.create({ cohortIds: null as unknown as string[], scope: 'cohort' }),
    ).toThrow(InvalidAccessScopeError);
  });

  it('throws InvalidAccessScopeError when scope is invalid', () => {
    expect(() =>
      AccessScope.create({ cohortIds: [], scope: 'invalid' as 'cohort' }),
    ).toThrow(InvalidAccessScopeError);
  });

  it('creates valid AccessScope with cohort scope', () => {
    const scope = AccessScope.create({ cohortIds: ['c1', 'c2'], scope: 'cohort' });
    expect(scope.cohortIds).toEqual(['c1', 'c2']);
    expect(scope.scope).toBe('cohort');
  });

  it('creates valid AccessScope with global scope', () => {
    const scope = AccessScope.create({ cohortIds: [], scope: 'global' });
    expect(scope.scope).toBe('global');
  });

  it('equals returns true for same values', () => {
    const a = AccessScope.create({ cohortIds: ['c1'], scope: 'cohort' });
    const b = AccessScope.create({ cohortIds: ['c1'], scope: 'cohort' });
    expect(a.equals(b)).toBe(true);
  });
});
