/**
 * IAppendEventPort — driven port for persisting domain events to the Ledger.
 * Used by all three gate use cases (RunP1Gate, RunP2Gate, RunP3Gate).
 * Per ei-runtime-tactical-spec.md §8 (Ports).
 */

export interface AppendEventPayload {
  studentId: string;
  eventType: string;
  topicId: string;
  payload: Record<string, unknown>;
  /** Optional idempotency key — stored in ei_idempotency_keys; prevents duplicate events on retry. */
  idempotencyKey?: string;
}

export interface IAppendEventPort {
  append(event: AppendEventPayload): Promise<void>;
}
