/**
 * StartBackfillJobHandler unit tests.
 * Verifies validation (empty projectionNames, invalid projection) and execution wiring.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StartBackfillJobHandler } from '../../../../application/start-backfill-job/handler';
import type {
  IBackfillJobRepository,
  IResolveStudentScopePort,
  IGetTopicsForStudentsPort,
} from '../../../../application/start-backfill-job/port';

describe('StartBackfillJobHandler', () => {
  let repo: IBackfillJobRepository;
  let scopeResolver: IResolveStudentScopePort;
  let topicsPort: IGetTopicsForStudentsPort;

  beforeEach(() => {
    repo = {
      save: vi.fn().mockResolvedValue(undefined),
      getById: vi.fn(),
      updateProgress: vi.fn(),
      findResumable: vi.fn(),
      findNextQueuedOrRunning: vi.fn(),
    };
    scopeResolver = {
      resolveStudentIds: vi.fn().mockResolvedValue(['s1']),
    };
    topicsPort = {
      getTopicsByStudent: vi.fn().mockResolvedValue(new Map([['s1', ['t1']]])),
    };
  });

  it('throws when projectionNames is empty', async () => {
    const handler = new StartBackfillJobHandler(repo, scopeResolver, topicsPort);

    await expect(
      handler.execute({ projectionNames: [], studentIds: ['s1'] })
    ).rejects.toThrow('projectionNames is required and must not be empty');

    expect(scopeResolver.resolveStudentIds).not.toHaveBeenCalled();
  });

  it('throws when projection name is invalid', async () => {
    const handler = new StartBackfillJobHandler(repo, scopeResolver, topicsPort);

    await expect(
      handler.execute({ projectionNames: ['FakeProjection'], studentIds: ['s1'] })
    ).rejects.toThrow('Invalid projection name: FakeProjection. Allowed: TopicLoop, StudentAggregates, StudentPolicy');

    expect(scopeResolver.resolveStudentIds).not.toHaveBeenCalled();
  });

  it('valid execution calls repo.save and returns jobId, status, createdAt', async () => {
    const handler = new StartBackfillJobHandler(repo, scopeResolver, topicsPort);

    const result = await handler.execute({
      projectionNames: ['StudentAggregates'],
      studentIds: ['s1'],
    });

    expect(result.status).toBe('queued');
    expect(result.jobId).toBeDefined();
    expect(typeof result.jobId).toBe('string');
    expect(result.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);

    expect(repo.save).toHaveBeenCalledTimes(1);
    const savedJob = (repo.save as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(savedJob.status).toBe('queued');
    expect(savedJob.projectionNames).toEqual(['StudentAggregates']);
    expect(savedJob.studentIds).toEqual(['s1']);
    expect(savedJob.totalUnits).toBe(1);
    expect(savedJob.completedUnits).toBe(0);
  });

  it('invokes scopeResolver with studentIds and topicsPort with resolved studentIds', async () => {
    scopeResolver = {
      resolveStudentIds: vi.fn().mockResolvedValue(['s1', 's2']),
    };
    topicsPort = {
      getTopicsByStudent: vi.fn().mockResolvedValue(
        new Map([
          ['s1', ['t1']],
          ['s2', []],
        ])
      ),
    };
    const handler = new StartBackfillJobHandler(repo, scopeResolver, topicsPort);

    await handler.execute({
      projectionNames: ['StudentAggregates'],
      studentIds: ['s1', 's2'],
    });

    expect(scopeResolver.resolveStudentIds).toHaveBeenCalledWith(['s1', 's2']);
    expect(topicsPort.getTopicsByStudent).toHaveBeenCalledWith(['s1', 's2']);
  });
});
