/**
 * Ports for CancelBackfillJob use case.
 * Per ops-observability-tactical-spec.md §4 CancelBackfillJob.
 */

export interface CancelBackfillJobResult {
  jobId: string;
  status: 'cancelled';
}

export interface ICancelBackfillJobUseCase {
  execute(jobId: string): Promise<CancelBackfillJobResult | null>;
}
