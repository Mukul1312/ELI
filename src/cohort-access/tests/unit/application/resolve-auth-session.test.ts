import { describe, it, expect } from 'vitest';
import { ResolveAuthSessionHandler } from '../../../application/resolve-auth-session/handler';
import { AuthSession } from '../../../domain/shared/auth-session';
import { Role } from '../../../domain/shared/role';
import { AccessScope } from '../../../domain/shared/access-scope';

describe('ResolveAuthSessionHandler', () => {
  it('returns null when port returns null (unauthenticated)', async () => {
    const resolveAuthPort = {
      resolve: async () => null,
    };
    const handler = new ResolveAuthSessionHandler(resolveAuthPort);
    const result = await handler.execute({ sessionContext: {} });
    expect(result).toBeNull();
  });

  it('returns AuthSession when port returns valid session', async () => {
    const session = AuthSession.create({
      studentId: 'student-123',
      cohortId: 'cohort-456',
      role: Role.create('student'),
      accessScope: AccessScope.create({ cohortIds: ['cohort-456'], scope: 'cohort' }),
    });
    const resolveAuthPort = {
      resolve: async () => session,
    };
    const handler = new ResolveAuthSessionHandler(resolveAuthPort);
    const result = await handler.execute({ sessionContext: {} });
    expect(result).not.toBeNull();
    expect(result!.studentId).toBe('student-123');
    expect(result!.cohortId).toBe('cohort-456');
  });
});
