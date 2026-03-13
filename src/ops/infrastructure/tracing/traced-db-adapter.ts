/**
 * TracedDbAdapter — wraps eiStore.db with per-query span emission.
 *
 * Business code receives this as a drop-in replacement for EiDb.
 * Every DB method call emits a span via ITracerPort with label, duration, and correlationId.
 *
 * Per ops-observability-tactical-spec.md §6 / §8 (Phase 3).
 */

import type { ITracerPort } from '../../application/tracing/port';
import type { EiDb } from '@/ei/runtime/db';

/**
 * Creates a traced wrapper around an EiDb instance.
 * Each call to one/oneOrNone/many/none/any emits a span.
 *
 * @param db - The raw EiDb instance (PostgresStore['db'])
 * @param tracer - ITracerPort implementation for span emission
 * @param correlationId - Request-scoped ID for grouping spans
 */
export function createTracedDb(db: EiDb, tracer: ITracerPort, correlationId: string): EiDb {
  function extractLabel(query: string): string {
    // Extract a short label from the SQL: first meaningful keyword + table name.
    const normalized = query.replace(/\s+/g, ' ').trim().substring(0, 120);
    return normalized;
  }

  function wrapMethod<K extends keyof EiDb>(method: K): EiDb[K] {
    return (async (query: string, params?: unknown[]) => {
      const startedAt = new Date().toISOString();
      const t0 = performance.now();
      try {
        const result = await (db[method] as Function)(query, params);
        return result;
      } finally {
        tracer.emitSpan({
          correlationId,
          label: `db:${method}`,
          durationMs: Math.round(performance.now() - t0),
          startedAt,
          metadata: { sql: extractLabel(query) },
        });
      }
    }) as EiDb[K];
  }

  return {
    one: wrapMethod('one'),
    oneOrNone: wrapMethod('oneOrNone'),
    many: wrapMethod('many'),
    none: wrapMethod('none'),
    any: wrapMethod('any'),
  } as EiDb;
}
