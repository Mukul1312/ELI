/**
 * Timeline route integration tests: RBAC and tenant isolation.
 *
 * Mocks createResolveAuthSessionUseCase to simulate admin/student/null sessions.
 * RBAC tests run without DB (mocks ei/runtime/db when DATABASE_URL absent).
 * Admin 200 test requires DATABASE_URL (handler reads from ei_events/aggregates).
 */

import 'dotenv/config';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AuthSession } from '@/cohort-access/domain/shared/auth-session';
import { Role } from '@/cohort-access/domain/shared/role';
import { AccessScope } from '@/cohort-access/domain/shared/access-scope';
import { NextRequest } from 'next/server';

const shouldRunDbTests = !!process.env.DATABASE_URL;

const mockCreateResolveAuthSessionUseCase = vi.fn();

// When DATABASE_URL is absent, mock ei/runtime/db so the route module can load.
// When present, use real module so the 200 test gets real queryEvents/getAggregates.
vi.mock('@/ei/runtime/db', async (importOriginal) => {
  if (process.env.DATABASE_URL) {
    return importOriginal<typeof import('@/ei/runtime/db')>();
  }
  const mockOneOrNone = vi.fn();
  const mockAny = vi.fn();
  return {
    eiStore: {
      db: {
        one: vi.fn(),
        oneOrNone: mockOneOrNone,
        many: vi.fn(),
        any: mockAny,
        none: vi.fn(),
      },
    },
    getEiRequestContext: vi.fn(),
    getEiDb: vi.fn(),
  };
});

vi.mock('@/lib/auth/server', () => ({
  createServerGetSession: () => async () => null,
}));

vi.mock('@/lib/cohort-access', () => ({
  createResolveAuthSessionUseCase: (...args: unknown[]) => mockCreateResolveAuthSessionUseCase(...args),
}));

describe('GET /api/admin/students/[studentId]/timeline', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when no session', async () => {
    mockCreateResolveAuthSessionUseCase.mockReturnValue({
      execute: async () => null,
    });

    const { GET } = await import('@/app/api/admin/students/[studentId]/timeline/route');
    const req = new NextRequest('http://localhost/api/admin/students/s1/timeline');
    const res = await GET(req, { params: Promise.resolve({ studentId: 's1' }) });

    expect(res.status).toBe(401);
  });

  it('returns 403 when session is student role', async () => {
    const studentSession = AuthSession.create({
      studentId: 's1',
      cohortId: 'c1',
      role: Role.create('student'),
      accessScope: AccessScope.create({ cohortIds: ['c1'], scope: 'cohort' }),
    });

    mockCreateResolveAuthSessionUseCase.mockReturnValue({
      execute: async () => studentSession,
    });

    const { GET } = await import('@/app/api/admin/students/[studentId]/timeline/route');
    const req = new NextRequest('http://localhost/api/admin/students/s1/timeline');
    const res = await GET(req, { params: Promise.resolve({ studentId: 's1' }) });

    expect(res.status).toBe(403);
  });

  it('returns 403 when cohort-scoped admin accesses student outside cohort', async () => {
    const cohortAdminSession = AuthSession.create({
      studentId: 'admin-1',
      cohortId: 'cA',
      role: Role.create('admin'),
      accessScope: AccessScope.create({ cohortIds: ['cA'], scope: 'cohort' }),
    });

    mockCreateResolveAuthSessionUseCase.mockReturnValue({
      execute: async () => cohortAdminSession,
    });

    // When no DB: mock oneOrNone to return student in cohort cB (admin has cA only).
    // When DB present: use nonexistent studentId so oneOrNone returns null → 403.
    if (!process.env.DATABASE_URL) {
      const { eiStore } = await import('@/ei/runtime/db');
      const db = eiStore.db as unknown as { oneOrNone: ReturnType<typeof vi.fn> };
      db.oneOrNone.mockResolvedValue({ cohort_id: 'cB' });
    }

    const { GET } = await import('@/app/api/admin/students/[studentId]/timeline/route');
    const studentId = process.env.DATABASE_URL
      ? '00000000-0000-0000-0000-000000000001'
      : 's-outside';
    const req = new NextRequest(`http://localhost/api/admin/students/${studentId}/timeline`);
    const res = await GET(req, { params: Promise.resolve({ studentId }) });

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toMatch(/cohort/i);
  });

  describe.skipIf(!shouldRunDbTests)('with DATABASE_URL', () => {
    it('returns 200 when admin session', async () => {
      const adminSession = AuthSession.create({
        studentId: 'admin-1',
        cohortId: null,
        role: Role.create('admin'),
        accessScope: AccessScope.create({ cohortIds: [], scope: 'global' }),
      });

      mockCreateResolveAuthSessionUseCase.mockReturnValue({
        execute: async () => adminSession,
      });

      const { GET } = await import('@/app/api/admin/students/[studentId]/timeline/route');
      const req = new NextRequest('http://localhost/api/admin/students/s1/timeline');
      const res = await GET(req, { params: Promise.resolve({ studentId: 's1' }) });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toHaveProperty('events');
      expect(body).toHaveProperty('aggregates');
    });
  });

  describe('dev bypass', () => {
    afterEach(() => {
      vi.unstubAllEnvs();
    });

    it('returns 401 when NODE_ENV is not development (bypass disabled)', async () => {
      vi.stubEnv('NODE_ENV', 'production');

      mockCreateResolveAuthSessionUseCase.mockReturnValue({
        execute: async () => null,
      });

      const { GET } = await import('@/app/api/admin/students/[studentId]/timeline/route');
      const req = new NextRequest('http://localhost/api/admin/students/s1/timeline');
      const res = await GET(req, { params: Promise.resolve({ studentId: 's1' }) });

      expect(res.status).toBe(401);
    });

    it('returns 200 when NODE_ENV is development and no secret (bypass allowed)', async () => {
      vi.stubEnv('NODE_ENV', 'development');
      vi.stubEnv('OPS_DEV_BYPASS_SECRET', '');

      if (!process.env.DATABASE_URL) {
        const { eiStore } = await import('@/ei/runtime/db');
        const db = eiStore.db as unknown as {
          any: ReturnType<typeof vi.fn>;
          oneOrNone: ReturnType<typeof vi.fn>;
        };
        db.any.mockResolvedValue([]);
        db.oneOrNone.mockResolvedValue(null);
      }

      const { GET } = await import('@/app/api/admin/students/[studentId]/timeline/route');
      const req = new NextRequest('http://localhost/api/admin/students/s1/timeline');
      const res = await GET(req, { params: Promise.resolve({ studentId: 's1' }) });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toHaveProperty('events');
      expect(body).toHaveProperty('aggregates');
    });
  });
});
