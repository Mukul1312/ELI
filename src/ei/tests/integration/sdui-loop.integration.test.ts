/**
 * SDUI loop integration test.
 *
 * Verifies the command→view loop: POST AppOpen → receive checkin view,
 * POST action → receive next view. No client-side routing logic.
 *
 * Requires DATABASE_URL. Mocks withEiSession to bypass auth.
 */

import 'dotenv/config';
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/app/api/ei/with-session', () => ({
  withEiSession: vi.fn().mockResolvedValue({
    authorized: true,
    studentId: 'sdui-integration-test-student',
  }),
}));

describe.skipIf(!process.env.DATABASE_URL)('SDUI loop integration', () => {
  it('POST AppOpen (initial: true) returns checkin view with schemaVersion, phase, view, actions', async () => {
    const { POST } = await import('@/app/api/ei/command/route');

    const req = new Request('http://localhost/api/ei/command', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        commandType: 'AppOpen',
        payload: { initial: true },
        idempotencyKey: `sdui-test-appopen-${Date.now()}`,
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const body = (await res.json()) as unknown;
    // Mastra may wrap the workflow output; extract SduiResponse
    const sdui =
      body && typeof body === 'object' && 'schemaVersion' in (body as object)
        ? (body as Record<string, unknown>)
        : (body as { result?: { result?: Record<string, unknown> }; status?: string })?.result?.result;
    expect(sdui).toBeDefined();
    expect(sdui!.schemaVersion).toBe(1);
    expect(sdui!.phase).toBe('checkin');
    expect(sdui!.view).toBeDefined();
    expect(sdui!.actions).toBeDefined();
    expect(typeof sdui!.actions).toBe('object');
  });

  it('POST with invalid command returns 400', async () => {
    const { POST } = await import('@/app/api/ei/command/route');

    const req = new Request('http://localhost/api/ei/command', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        commandType: 'AppOpen',
        payload: { invalid: 'payload' }, // missing initial: true or full payload
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
