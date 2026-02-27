/**
 * Backfill routes integration tests: OpsAuth and scope validation.
 *
 * Tests run without DB when DATABASE_URL absent (mocks ei/runtime/db).
 */

import 'dotenv/config';
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll } from 'vitest';
import { NextRequest } from 'next/server';

// Force mock to be used by clearing DATABASE_URL before any route imports db.
beforeAll(() => {
  vi.stubEnv('DATABASE_URL', '');
});

// When DATABASE_URL is absent, mock ei/runtime/db so the route modules can load.
vi.mock('@/ei/runtime/db', async (importOriginal) => {
  if (process.env.DATABASE_URL) {
    return importOriginal<typeof import('@/ei/runtime/db')>();
  }
  const mockNone = vi.fn();
  const mockOneOrNone = vi.fn();
  const mockAny = vi.fn();
  return {
    eiStore: {
      db: {
        one: vi.fn(),
        oneOrNone: mockOneOrNone,
        many: vi.fn(),
        any: mockAny,
        none: mockNone,
      },
    },
  };
});

function createPostRequest(
  url: string,
  body: unknown,
  headers?: HeadersInit
): NextRequest {
  return new NextRequest(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
}

describe('POST /api/admin/backfill/jobs', () => {
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

      const req = createPostRequest('http://localhost/api/admin/backfill/jobs', {
        projectionNames: ['StudentAggregates'],
        studentIds: ['s1'],
      });
      const { POST } = await import('@/app/api/admin/backfill/jobs/route');
      const res = await POST(req);

      expect(res.status).toBe(401);
    });

    it('returns 401 when OPS_API_KEY invalid', async () => {
      vi.stubEnv('OPS_API_KEY', 'correct-key');
      vi.stubEnv('CRON_SECRET', '');

      const req = createPostRequest('http://localhost/api/admin/backfill/jobs', {
        projectionNames: ['StudentAggregates'],
        studentIds: ['s1'],
      }, { 'x-ops-api-key': 'wrong-key' });
      const { POST } = await import('@/app/api/admin/backfill/jobs/route');
      const res = await POST(req);

      expect(res.status).toBe(401);
    });

    it('returns 200 when OPS_API_KEY valid and body valid', async () => {
      vi.stubEnv('OPS_API_KEY', 'test-key-123');
      vi.stubEnv('CRON_SECRET', '');
      vi.stubEnv('DATABASE_URL', '');

      const { eiStore } = await import('@/ei/runtime/db');
      const db = eiStore.db as unknown as {
        any: ReturnType<typeof vi.fn>;
        none: ReturnType<typeof vi.fn>;
      };
      db.any.mockResolvedValue([]);
      db.none.mockResolvedValue(undefined as never);

      const req = createPostRequest('http://localhost/api/admin/backfill/jobs', {
        projectionNames: ['StudentAggregates'],
        studentIds: ['s1'],
      }, { 'x-ops-api-key': 'test-key-123' });
      const { POST } = await import('@/app/api/admin/backfill/jobs/route');
      const res = await POST(req);

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toHaveProperty('jobId');
      expect(body).toHaveProperty('status', 'queued');
      expect(body).toHaveProperty('createdAt');
    });
  });

  describe('scope validation', () => {
    beforeEach(() => {
      vi.stubEnv('NODE_ENV', 'production');
      vi.stubEnv('OPS_API_KEY', 'test-key');
      vi.stubEnv('CRON_SECRET', '');
    });

    it('returns 400 when projectionNames is empty array', async () => {
      const req = createPostRequest('http://localhost/api/admin/backfill/jobs', {
        projectionNames: [],
        studentIds: ['s1'],
      }, { 'x-ops-api-key': 'test-key' });
      const { POST } = await import('@/app/api/admin/backfill/jobs/route');
      const res = await POST(req);

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toContain('projectionNames');
    });

    it('returns 400 when projection name is invalid', async () => {
      const req = createPostRequest('http://localhost/api/admin/backfill/jobs', {
        projectionNames: ['UnknownProjection'],
        studentIds: ['s1'],
      }, { 'x-ops-api-key': 'test-key' });
      const { POST } = await import('@/app/api/admin/backfill/jobs/route');
      const res = await POST(req);

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toContain('Invalid projection name');
      expect(body.error).toContain('UnknownProjection');
    });
  });
});

describe('POST /api/admin/backfill/run', () => {
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

      const req = new NextRequest('http://localhost/api/admin/backfill/run', {
        method: 'POST',
      });
      const { POST } = await import('@/app/api/admin/backfill/run/route');
      const res = await POST(req);

      expect(res.status).toBe(401);
    });

    it('returns 200 when CRON_SECRET valid (no queued job)', async () => {
      vi.stubEnv('OPS_API_KEY', '');
      vi.stubEnv('CRON_SECRET', 'cron-secret-456');
      vi.stubEnv('DATABASE_URL', '');

      const { eiStore } = await import('@/ei/runtime/db');
      const db = eiStore.db as unknown as { oneOrNone: ReturnType<typeof vi.fn> };
      db.oneOrNone.mockResolvedValue(null);

      const req = new NextRequest('http://localhost/api/admin/backfill/run', {
        method: 'POST',
        headers: { 'x-cron-secret': 'cron-secret-456' },
      });
      const { POST } = await import('@/app/api/admin/backfill/run/route');
      const res = await POST(req);

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.message).toBe('No queued or running job to execute');
    });
  });
});

describe('POST /api/admin/backfill/jobs/[jobId]/cancel', () => {
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

      const req = new NextRequest(
        'http://localhost/api/admin/backfill/jobs/job-123/cancel',
        { method: 'POST' }
      );
      const { POST } = await import(
        '@/app/api/admin/backfill/jobs/[jobId]/cancel/route'
      );
      const res = await POST(req, {
        params: Promise.resolve({ jobId: 'job-123' }),
      });

      expect(res.status).toBe(401);
    });

    it('returns 200 when OpsAuth valid and job is queued', async () => {
      vi.stubEnv('OPS_API_KEY', 'test-key');
      vi.stubEnv('CRON_SECRET', '');
      vi.stubEnv('DATABASE_URL', '');

      const { eiStore } = await import('@/ei/runtime/db');
      const db = eiStore.db as unknown as {
        oneOrNone: ReturnType<typeof vi.fn>;
        none: ReturnType<typeof vi.fn>;
      };
      const now = new Date();
      db.oneOrNone.mockResolvedValue({
          id: '550e8400-e29b-41d4-a716-446655440000',
          status: 'queued',
          projection_names: ['StudentAggregates'],
          student_ids: ['s1'],
          throttle_ops_per_sec: null,
          projection_version: null,
          total_units: 1,
          completed_units: 0,
          checkpoint_payload: null,
          error_message: null,
          created_at: now,
          started_at: null,
          completed_at: null,
          updated_at: now,
        });
      db.none.mockResolvedValue(undefined as never);

      const jobId = '550e8400-e29b-41d4-a716-446655440000';
      const req = new NextRequest(
        `http://localhost/api/admin/backfill/jobs/${jobId}/cancel`,
        { method: 'POST', headers: { 'x-ops-api-key': 'test-key' } }
      );
      const { POST } = await import(
        '@/app/api/admin/backfill/jobs/[jobId]/cancel/route'
      );
      const res = await POST(req, {
        params: Promise.resolve({ jobId }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toEqual({ jobId, status: 'cancelled' });
    });
  });
});
