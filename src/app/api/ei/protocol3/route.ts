/**
 * POST /api/ei/protocol3
 *
 * Runs Protocol 3 (Verification): takes session-end data, returns VerificationDecisionIssued.
 *
 * Body: { studentId, topic, endedAt }
 * Auth: Bearer <PILOT_SECRET>
 */

import { runProtocol3 } from '@/ei/protocol-runner';
import { getEiRequestContext } from '@/ei/runtime/db';

export const dynamic = 'force-dynamic';

function isAuthorized(req: Request): boolean {
  const secret = process.env.PILOT_SECRET;
  if (!secret) return true;
  const header = req.headers.get('Authorization') ?? '';
  return header === `Bearer ${secret}`;
}

export async function POST(req: Request) {
  if (!isAuthorized(req)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { studentId, topic, endedAt } = body;
  if (!studentId || !topic || !endedAt) {
    return Response.json({ error: 'Missing required fields: studentId, topic, endedAt' }, { status: 400 });
  }

  try {
    const ctx = getEiRequestContext();
    const result = await runProtocol3({ studentId, topic, endedAt }, ctx as any);
    return Response.json(result);
  } catch (err: any) {
    console.error('[POST /api/ei/protocol3]', err);
    return Response.json({ error: err?.message ?? 'Internal error' }, { status: 500 });
  }
}
