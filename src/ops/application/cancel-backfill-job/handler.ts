/**
 * CancelBackfillJobHandler — implements ICancelBackfillJobUseCase.
 * Cancels a queued or running backfill job.
 */

import type { IBackfillJobRepository } from '@/ops/application/start-backfill-job/port';
import type { ICancelBackfillJobUseCase, CancelBackfillJobResult } from './port';

export class CancelBackfillJobHandler implements ICancelBackfillJobUseCase {
  constructor(private readonly repo: IBackfillJobRepository) {}

  async execute(jobId: string): Promise<CancelBackfillJobResult | null> {
    const job = await this.repo.getById(jobId);
    if (!job) return null;

    if (job.status !== 'queued' && job.status !== 'running') {
      return null;
    }

    await this.repo.updateProgress(jobId, { status: 'cancelled' });

    return { jobId, status: 'cancelled' };
  }
}
