/**
 * IEventAppender — driven port for appending SSO domain events to the Ledger.
 *
 * Per tactical spec §8: driven port in application/shared/port-*.ts.
 * Per canvas §Outbound: FlowSelected → Ledger.
 *
 * Narrower than IAppendEventPort (EI Runtime): SSO only appends its own events.
 */

export interface SsoEventPayload {
  readonly studentId: string;
  readonly eventType: string;
  readonly topicId: string | null;
  readonly payload: Record<string, unknown>;
  readonly idempotencyKey?: string;
}

export interface IEventAppender {
  append(event: SsoEventPayload): Promise<void>;
}
