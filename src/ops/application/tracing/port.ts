/**
 * ITracerPort — driven port for request-scoped span/trace propagation.
 *
 * Per ops-observability-tactical-spec.md §6 (Phase 3).
 * Lightweight structured spans; compatible with future OTel migration.
 */

export interface Span {
  /** Request-scoped correlation ID for grouping spans. */
  correlationId: string;
  /** Human-readable label, e.g. "db:getAggregates", "auth:getSession". */
  label: string;
  /** Wall-clock duration in milliseconds. */
  durationMs: number;
  /** ISO-8601 timestamp when the span started. */
  startedAt: string;
  /** Optional key-value metadata (query params, error info, etc.). */
  metadata?: Record<string, unknown>;
}

export interface ITracerPort {
  emitSpan(span: Span): void;
}
