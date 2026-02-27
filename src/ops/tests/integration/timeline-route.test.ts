/**
 * Timeline route integration tests: OpsAuth (API key, cron secret, dev bypass).
 *
 * Tests run without DB when DATABASE_URL absent (mocks ei/runtime/db).
 * 200 tests with real handler require DATABASE_URL.
 */

import 'dotenv/config';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

const shouldRunDbTests = !!process.env.DATABASE_URL;

// When DATABASE_URL is absent, mock ei/runtime/db so the route module can load.
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
  };
});

function createRequest(url = 'http://localhost/api/admin/students/s1/timeline', headers?: HeadersInit): NextRequest {
  return new NextRequest(url, { headers });
}

describe('GET /api/admin/students/[studentId]/timeline', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('OpsAuth — production', () => {
    beforeEach(() => {
      vi.stubEnv('NODE_ENV', 'production');
    });

    it('returns 401 when OpsAuth missing', async () => {
      vi.stubEnv('OPS_API_KEY', '');
      vi.stubEnv('CRON_SECRET', '');

      const { GET } = await import('@/app/api/admin/students/[studentId]/timeline/route');
      const req = createRequest();
      const res = await GET(req, { params: Promise.resolve({ studentId: 's1' }) });

      expect(res.status).toBe(401);
    });

    it('returns 401 when OPS_API_KEY invalid', async () => {
      vi.stubEnv('OPS_API_KEY', 'correct-key');
      vi.stubEnv('CRON_SECRET', '');

      const req = createRequest(undefined, { 'x-ops-api-key': 'wrong-key' });
      const { GET } = await import('@/app/api/admin/students/[studentId]/timeline/route');
      const res = await GET(req, { params: Promise.resolve({ studentId: 's1' }) });

      expect(res.status).toBe(401);
    });

    it('returns 200 when OPS_API_KEY valid', async () => {
      vi.stubEnv('OPS_API_KEY', 'test-key-123');
      vi.stubEnv('CRON_SECRET', '');

      if (!process.env.DATABASE_URL) {
        const { eiStore } = await import('@/ei/runtime/db');
        const db = eiStore.db as unknown as { any: ReturnType<typeof vi.fn>; oneOrNone: ReturnType<typeof vi.fn> };
        db.any.mockResolvedValue([]);
        db.oneOrNone.mockResolvedValue(null);
      }

      const req = createRequest(undefined, { 'x-ops-api-key': 'test-key-123' });
      const { GET } = await import('@/app/api/admin/students/[studentId]/timeline/route');
      const res = await GET(req, { params: Promise.resolve({ studentId: 's1' }) });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toHaveProperty('events');
      expect(body).toHaveProperty('aggregates');
    });

    it('returns 200 when OPS_API_KEY valid via Authorization Bearer', async () => {
      vi.stubEnv('OPS_API_KEY', 'bearer-key');
      vi.stubEnv('CRON_SECRET', '');

      if (!process.env.DATABASE_URL) {
        const { eiStore } = await import('@/ei/runtime/db');
        const db = eiStore.db as unknown as { any: ReturnType<typeof vi.fn>; oneOrNone: ReturnType<typeof vi.fn> };
        db.any.mockResolvedValue([]);
        db.oneOrNone.mockResolvedValue(null);
      }

      const req = createRequest(undefined, { authorization: 'Bearer bearer-key' });
      const { GET } = await import('@/app/api/admin/students/[studentId]/timeline/route');
      const res = await GET(req, { params: Promise.resolve({ studentId: 's1' }) });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toHaveProperty('events');
      expect(body).toHaveProperty('aggregates');
    });

    it('returns 200 when CRON_SECRET valid', async () => {
      vi.stubEnv('OPS_API_KEY', '');
      vi.stubEnv('CRON_SECRET', 'cron-secret-456');

      if (!process.env.DATABASE_URL) {
        const { eiStore } = await import('@/ei/runtime/db');
        const db = eiStore.db as unknown as { any: ReturnType<typeof vi.fn>; oneOrNone: ReturnType<typeof vi.fn> };
        db.any.mockResolvedValue([]);
        db.oneOrNone.mockResolvedValue(null);
      }

      const req = createRequest(undefined, { 'x-cron-secret': 'cron-secret-456' });
      const { GET } = await import('@/app/api/admin/students/[studentId]/timeline/route');
      const res = await GET(req, { params: Promise.resolve({ studentId: 's1' }) });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toHaveProperty('events');
      expect(body).toHaveProperty('aggregates');
    });
  });

  describe('dev bypass', () => {
    it('returns 401 when NODE_ENV is not development (bypass disabled)', async () => {
      vi.stubEnv('NODE_ENV', 'production');
      vi.stubEnv('OPS_API_KEY', '');
      vi.stubEnv('CRON_SECRET', '');

      const { GET } = await import('@/app/api/admin/students/[studentId]/timeline/route');
      const req = createRequest();
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
      const req = createRequest();
      const res = await GET(req, { params: Promise.resolve({ studentId: 's1' }) });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toHaveProperty('events');
      expect(body).toHaveProperty('aggregates');
    });

    it('returns 200 when NODE_ENV is development and OPS_DEV_BYPASS_SECRET matches', async () => {
      vi.stubEnv('NODE_ENV', 'development');
      vi.stubEnv('OPS_DEV_BYPASS_SECRET', 'dev-secret');
      vi.stubEnv('OPS_API_KEY', '');
      vi.stubEnv('CRON_SECRET', '');

      if (!process.env.DATABASE_URL) {
        const { eiStore } = await import('@/ei/runtime/db');
        const db = eiStore.db as unknown as { any: ReturnType<typeof vi.fn>; oneOrNone: ReturnType<typeof vi.fn> };
        db.any.mockResolvedValue([]);
        db.oneOrNone.mockResolvedValue(null);
      }

      const req = createRequest(undefined, { 'x-ops-dev-bypass': 'dev-secret' });
      const { GET } = await import('@/app/api/admin/students/[studentId]/timeline/route');
      const res = await GET(req, { params: Promise.resolve({ studentId: 's1' }) });

      expect(res.status).toBe(200);
    });
  });

  describe.skipIf(!shouldRunDbTests)('with DATABASE_URL', () => {
    it('returns 200 when OPS_API_KEY valid and handler returns real data', async () => {
      vi.stubEnv('NODE_ENV', 'production');
      vi.stubEnv('OPS_API_KEY', 'e2e-key');
      vi.stubEnv('CRON_SECRET', '');

      const req = createRequest(undefined, { 'x-ops-api-key': 'e2e-key' });
      const { GET } = await import('@/app/api/admin/students/[studentId]/timeline/route');
      const res = await GET(req, { params: Promise.resolve({ studentId: 's1' }) });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toHaveProperty('events');
      expect(body).toHaveProperty('aggregates');
    });
  });
});
