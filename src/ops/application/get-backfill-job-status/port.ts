/**
 * Ports for GetBackfillJobStatus use case.
 * Per ops-observability-tactical-spec.md §4 GetBackfillJobStatus.
 */

export interface GetBackfillJobStatusResult {
  jobId: string;
  status: string;
  progress?: { completed: number; total: number };
  startedAt?: string;
  completedAt?: string;
  error?: string;
}

export interface IGetBackfillJobStatusUseCase {
  execute(jobId: string): Promise<GetBackfillJobStatusResult | null>;
}
