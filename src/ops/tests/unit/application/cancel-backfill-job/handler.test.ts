/**
 * CancelBackfillJobHandler unit tests.
 * Verifies job not found, wrong status (completed/cancelled/failed), and cancel when queued/running.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CancelBackfillJobHandler } from '../../../../application/cancel-backfill-job/handler';
import type { IBackfillJobRepository } from '../../../../application/start-backfill-job/port';

function makeJob(overrides: Partial<{ id: string; status: string }> = {}) {
  const now = new Date();
  return {
    id: 'job-1',
    status: 'queued',
    projectionNames: ['StudentAggregates'],
    studentIds: ['s1'],
    throttleOpsPerSec: null,
    projectionVersion: null,
    totalUnits: 1,
    completedUnits: 0,
    checkpointPayload: null,
    errorMessage: null,
    createdAt: now,
    startedAt: null,
    completedAt: null,
    updatedAt: now,
    ...overrides,
  };
}

describe('CancelBackfillJobHandler', () => {
  let repo: IBackfillJobRepository;

  beforeEach(() => {
    repo = {
      save: vi.fn(),
      getById: vi.fn(),
      updateProgress: vi.fn(),
      findResumable: vi.fn(),
      findNextQueuedOrRunning: vi.fn(),
    };
  });

  it('returns null when job not found', async () => {
    (repo.getById as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const handler = new CancelBackfillJobHandler(repo);

    const result = await handler.execute('unknown-id');

    expect(result).toBeNull();
    expect(repo.updateProgress).not.toHaveBeenCalled();
  });

  it('returns null when job is completed', async () => {
    (repo.getById as ReturnType<typeof vi.fn>).mockResolvedValue(
      makeJob({ status: 'completed' })
    );
    const handler = new CancelBackfillJobHandler(repo);

    const result = await handler.execute('job-1');

    expect(result).toBeNull();
    expect(repo.updateProgress).not.toHaveBeenCalled();
  });

  it('returns null when job is cancelled', async () => {
    (repo.getById as ReturnType<typeof vi.fn>).mockResolvedValue(
      makeJob({ status: 'cancelled' })
    );
    const handler = new CancelBackfillJobHandler(repo);

    const result = await handler.execute('job-1');

    expect(result).toBeNull();
    expect(repo.updateProgress).not.toHaveBeenCalled();
  });

  it('returns null when job is failed', async () => {
    (repo.getById as ReturnType<typeof vi.fn>).mockResolvedValue(
      makeJob({ status: 'failed' })
    );
    const handler = new CancelBackfillJobHandler(repo);

    const result = await handler.execute('job-1');

    expect(result).toBeNull();
    expect(repo.updateProgress).not.toHaveBeenCalled();
  });

  it('returns { jobId, status: "cancelled" } and calls updateProgress when job is queued', async () => {
    (repo.getById as ReturnType<typeof vi.fn>).mockResolvedValue(
      makeJob({ status: 'queued' })
    );
    (repo.updateProgress as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    const handler = new CancelBackfillJobHandler(repo);

    const result = await handler.execute('job-1');

    expect(result).toEqual({ jobId: 'job-1', status: 'cancelled' });
    expect(repo.updateProgress).toHaveBeenCalledWith('job-1', {
      status: 'cancelled',
    });
  });

  it('returns { jobId, status: "cancelled" } and calls updateProgress when job is running', async () => {
    (repo.getById as ReturnType<typeof vi.fn>).mockResolvedValue(
      makeJob({ status: 'running' })
    );
    (repo.updateProgress as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    const handler = new CancelBackfillJobHandler(repo);

    const result = await handler.execute('job-1');

    expect(result).toEqual({ jobId: 'job-1', status: 'cancelled' });
    expect(repo.updateProgress).toHaveBeenCalledWith('job-1', {
      status: 'cancelled',
    });
  });
});
