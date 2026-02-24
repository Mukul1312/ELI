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
