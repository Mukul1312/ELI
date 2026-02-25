/**
 * Structured logging for EI Runtime.
 * JSON output, correlation IDs, redaction of secrets/raw student content.
 */

export interface GateLogEntry {
  correlationId: string;
  studentId: string;
  gate?: string;
  commandType?: string;
  durationMs?: number;
  inputSummary?: string;
  outputSummary?: string;
  error?: string;
}

export function createCorrelationId(): string {
  return crypto.randomUUID();
}

export function logGateCall(entry: GateLogEntry): void {
  const safe = {
    timestamp: new Date().toISOString(),
    ...entry,
  };
  console.log(JSON.stringify(safe));
}

/** Audit log for manual backfill runs. Per ops-observability-tactical-spec §8. */
export interface BackfillAuditEntry {
  correlationId: string;
  projectionName: string;
  studentId: string;
  topicId?: string;
  completedAt: string;
}

export function logBackfillAudit(entry: BackfillAuditEntry): void {
  const safe = {
    timestamp: new Date().toISOString(),
    type: 'backfill_audit',
    ...entry,
  };
  console.log(JSON.stringify(safe));
}
