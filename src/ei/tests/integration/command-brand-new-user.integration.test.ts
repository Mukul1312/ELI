/**
 * Integration test: /api/ei/command for brand-new user (no existing students row).
 *
 * Verifies that a valid Neon Auth session for a new signup yields 200 (not 401)
 * after identity provisioning. Mocks createServerGetSession to simulate a new user.
 *
 * Requires DATABASE_URL or Neon branching (NEON_API_KEY/NEON_TOKEN + NEON_PROJECT_ID).
 */

import 'dotenv/config';
import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest';
import { setupDbForTests } from '../../../test/db-test-setup';
import { canUseNeonBranching } from '../../../test/neon-postgres';

const shouldRunDbTests =
  !!process.env.DATABASE_URL || canUseNeonBranching();

const AUTH_USER_ID = `brand-new-ei-test-${Date.now()}`;

vi.mock('@/lib/auth/server', () => ({
  createServerGetSession: () => async () => ({
    user: { id: AUTH_USER_ID },
    session: { userId: AUTH_USER_ID },
  }),
}));

async function cleanupStudent(db: { none: (q: string, p?: unknown[]) => Promise<void> }): Promise<void> {
  await db.none('DELETE FROM students WHERE auth_user_id = $1', [AUTH_USER_ID]);
}

describe.skipIf(!shouldRunDbTests)(
  'POST /api/ei/command (brand-new user)',
  () => {
    let store: { db: { none: (q: string, p?: unknown[]) => Promise<void> } };
    let cleanupFn: () => Promise<void>;

    beforeAll(async () => {
      const setup = await setupDbForTests('command-brand-new-user');
      process.env.DATABASE_URL = setup.connectionString;
      store = setup.store;
      cleanupFn = setup.cleanup;
    });

    afterAll(async () => {
      await cleanupFn();
    });

    beforeEach(async () => {
      await cleanupStudent(store.db);
    });

    it(
      'returns 200 with SDUI when valid session and no existing student mapping',
      { timeout: 60000 },
      async () => {
      const { POST } = await import('@/app/api/ei/command/route');

      const req = new Request('http://localhost/api/ei/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commandType: 'AppOpen',
          payload: { initial: true },
          idempotencyKey: `brand-new-test-${Date.now()}`,
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(200);

      const body = (await res.json()) as unknown;
      const sdui =
        body && typeof body === 'object' && 'schemaVersion' in (body as object)
          ? (body as Record<string, unknown>)
          : (body as { result?: { result?: Record<string, unknown> }; status?: string })
              ?.result?.result;
      expect(sdui).toBeDefined();
      expect(sdui!.schemaVersion).toBe(1);
      expect(sdui!.phase).toBe('checkin');
      const view = (sdui as { view?: { body?: Array<{ type: string }> } })?.view;
      const welcomeCard = view?.body?.find((c: { type: string }) => c.type === 'onboarding-welcome-card');
      expect(welcomeCard).toBeDefined();
      expect((sdui as { actions?: Record<string, unknown> })?.actions?.onboarding_next).toBeDefined();
      },
    );
  },
);
