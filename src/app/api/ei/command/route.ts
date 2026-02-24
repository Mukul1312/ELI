/**
 * POST /api/ei/command
 *
 * Thin driver adapter: parses body, authenticates via Neon Auth session cookie,
 * delegates to RunEiCommandHandler, and maps typed errors to HTTP responses.
 *
 * All routing and workflow invocation lives in RunEiCommandHandler.
 */

import { EiCommandEnvelopeSchema } from '@/ei/application/ei-protocol-router';
import { withEiSession } from '@/app/api/ei/with-session';
import { RunEiCommandHandler } from '@/ei/application/run-ei-command/handler';
import {
  InvalidCommandError,
  InvalidTransitionError,
  IdempotencyConflictError,
} from '@/ei/application/run-ei-command/errors';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  // 1. Parse JSON body
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  // 2. Validate envelope (command + optional idempotencyKey)
  const parsed = EiCommandEnvelopeSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: 'Invalid command', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  // 4. Authenticate — studentId is server-derived from Neon Auth session cookie
  const auth = await withEiSession(req);
  if (!auth.authorized) return auth.response;

  // 5. Execute via orchestrator
  const { idempotencyKey, ...command } = parsed.data;
  try {
    const handler = new RunEiCommandHandler();
    const result = await handler.execute({
      command,
      studentId: auth.studentId,
      idempotencyKey,
    });
    return Response.json(result);
  } catch (err) {
    if (err instanceof InvalidCommandError)
      return Response.json({ error: err.message }, { status: 400 });
    if (err instanceof InvalidTransitionError)
      return Response.json({ error: err.message }, { status: 422 });
    if (err instanceof IdempotencyConflictError)
      return Response.json({ error: err.message }, { status: 409 });
    console.error('[POST /api/ei/command]', err);
    return Response.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 },
    );
  }
}
