import { describe, it, expect } from 'vitest';
import { EnsureStudentIdentityHandler } from '../../../application/ensure-student-identity/handler';
import type { IProvisionStudentIdentityPort } from '../../../application/ensure-student-identity/port';

describe('EnsureStudentIdentityHandler', () => {
  it('returns studentId and provisioned: false when mapping exists', async () => {
    const provisionPort: IProvisionStudentIdentityPort = {
      ensureMapping: async () => ({ studentId: 'existing-student-id', provisioned: false }),
    };
    const handler = new EnsureStudentIdentityHandler(provisionPort);
    const result = await handler.execute({ authUserId: 'auth-123' });
    expect(result.studentId).toBe('existing-student-id');
    expect(result.provisioned).toBe(false);
  });

  it('returns studentId and provisioned: true when mapping was created', async () => {
    const provisionPort: IProvisionStudentIdentityPort = {
      ensureMapping: async () => ({ studentId: 'newly-created-student-id', provisioned: true }),
    };
    const handler = new EnsureStudentIdentityHandler(provisionPort);
    const result = await handler.execute({ authUserId: 'auth-new-user' });
    expect(result.studentId).toBe('newly-created-student-id');
    expect(result.provisioned).toBe(true);
  });

  it('passes authUserId to port', async () => {
    const authUserId = 'auth-unique-456';
    const provisionPort: IProvisionStudentIdentityPort = {
      ensureMapping: async (id) => ({ studentId: `student-for-${id}`, provisioned: true }),
    };
    const handler = new EnsureStudentIdentityHandler(provisionPort);
    const result = await handler.execute({ authUserId });
    expect(result.studentId).toBe(`student-for-${authUserId}`);
  });
});
