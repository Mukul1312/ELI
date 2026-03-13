/**
 * TracedAuthAdapter — wraps auth phases (getSession, ensureMapping, resolveAuth)
 * with span emission via ITracerPort.
 *
 * Usage: call traceAsync() around each auth phase in withEiSession.
 * Per ops-observability-tactical-spec.md §6 / §8 (Phase 3).
 */

import type { ITracerPort } from '../../application/tracing/port';

/**
 * Wraps an async operation with span emission.
 * Returns the result of the operation; emits a span regardless of success/failure.
 */
export async function traceAsync<T>(
  tracer: ITracerPort,
  correlationId: string,
  label: string,
  fn: () => Promise<T>,
): Promise<T> {
  const startedAt = new Date().toISOString();
  const t0 = performance.now();
  try {
    return await fn();
  } finally {
    tracer.emitSpan({
      correlationId,
      label,
      durationMs: Math.round(performance.now() - t0),
      startedAt,
    });
  }
}
