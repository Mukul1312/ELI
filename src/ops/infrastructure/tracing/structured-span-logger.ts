/**
 * StructuredSpanLogger — ITracerPort implementation that emits spans as structured JSON.
 *
 * Follows the same pattern as logGateCall in src/ei/infrastructure/logging.ts.
 * Per ops-observability-tactical-spec.md §6 / §8 (Phase 3).
 */

import type { ITracerPort, Span } from '../../application/tracing/port';

export class StructuredSpanLogger implements ITracerPort {
  emitSpan(span: Span): void {
    console.log(JSON.stringify({
      type: 'span',
      correlationId: span.correlationId,
      label: span.label,
      durationMs: span.durationMs,
      startedAt: span.startedAt,
      ...(span.metadata && { metadata: span.metadata }),
    }));
  }
}
