/**
 * GetBackfillJobStatusHandler — implements IGetBackfillJobStatusUseCase.
 * Returns job status and progress for a given jobId.
 */

import type { IBackfillJobRepository } from '@/ops/application/start-backfill-job/port';
import type { IGetBackfillJobStatusUseCase, GetBackfillJobStatusResult } from './port';

export class GetBackfillJobStatusHandler implements IGetBackfillJobStatusUseCase {
  constructor(private readonly repo: IBackfillJobRepository) {}

  async execute(jobId: string): Promise<GetBackfillJobStatusResult | null> {
    const job = await this.repo.getById(jobId);
    if (!job) return null;

    const result: GetBackfillJobStatusResult = {
      jobId: job.id,
      status: job.status,
      startedAt: job.startedAt?.toISOString(),
      completedAt: job.completedAt?.toISOString(),
      error: job.errorMessage ?? undefined,
    };

    if (job.totalUnits != null) {
      result.progress = { completed: job.completedUnits, total: job.totalUnits };
    }

    return result;
  }
}
