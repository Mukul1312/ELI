/**
 * POST /api/ei/command
 *
 * Thin driver adapter: parses body, authenticates via Neon Auth session cookie,
 * rate limits, delegates to RunEiCommandHandler, and maps typed errors to HTTP responses.
 *
 * All routing and workflow invocation lives in RunEiCommandHandler.
 */

import { EiCommandEnvelopeSchema } from '@/ei/application/ei-protocol-router';
import { withEiSession } from '@/app/api/ei/with-session';
import { RunEiCommandHandler } from '@/ei/application/run-ei-command/handler';
import { eiStore } from '@/ei/runtime/db';
import { PostgresQueryEventsAdapter } from '@/ei/infrastructure/persistence/query-events.pg';
import {
  InvalidCommandError,
  InvalidTransitionError,
  IdempotencyConflictError,
} from '@/ei/application/run-ei-command/errors';
import { checkRateLimit } from '@/lib/rate-limit';
import { createCorrelationId, logGateCall } from '@/ei/infrastructure/logging';

export const dynamic = 'force-dynamic';

function getClientIp(req: Request): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? req.headers.get('x-real-ip') ?? 'unknown';
}

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

  // 3. Authenticate — studentId is server-derived from Neon Auth session cookie
  const auth = await withEiSession(req);
  if (!auth.authorized) {
    const rl = await checkRateLimit(null, getClientIp(req));
    if (!rl.allowed) {
      return Response.json(
        { error: 'Too many requests' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } },
      );
    }
    return auth.response;
  }

  // 4. Rate limit (by studentId when authenticated)
  const rl = await checkRateLimit(auth.studentId, getClientIp(req));
  if (!rl.allowed) {
    return Response.json(
      { error: 'Too many requests' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } },
    );
  }

  // 5. Execute via orchestrator
  const { idempotencyKey, ...command } = parsed.data;
  const correlationId = createCorrelationId();
  const start = performance.now();
  try {
    const queryEvents = new PostgresQueryEventsAdapter(eiStore.db);
    const handler = new RunEiCommandHandler(queryEvents);
    const raw = await handler.execute({
      command,
      studentId: auth.studentId,
      idempotencyKey,
      correlationId,
    });
    logGateCall({
      correlationId,
      studentId: auth.studentId,
      commandType: command.commandType,
      durationMs: Math.round(performance.now() - start),
    });
    // Mastra run.start() returns { status, result }; nested workflows nest again. Unwrap until we have the payload.
    let body: unknown = raw;
    while (
      body &&
      typeof body === 'object' &&
      'status' in body &&
      (body as { status: string }).status === 'success' &&
      'result' in body
    ) {
      body = (body as { result: unknown }).result;
    }
    return Response.json(body ?? raw);
  } catch (err) {
    logGateCall({
      correlationId,
      studentId: auth.studentId,
      commandType: command.commandType,
      durationMs: Math.round(performance.now() - start),
      error: err instanceof Error ? err.message : 'Unknown error',
    });
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
