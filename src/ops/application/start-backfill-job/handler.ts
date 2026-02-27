/**
 * StartBackfillJobHandler — implements IStartBackfillJobUseCase.
 * Creates a queued backfill job; worker picks it up.
 * Per ops-observability-tactical-spec.md §4 StartBackfillJob.
 */

import type {
  IStartBackfillJobUseCase,
  IBackfillJobRepository,
  IResolveStudentScopePort,
  IGetTopicsForStudentsPort,
  BackfillJobSnapshot,
} from './port';
import type { StartBackfillJobCommand } from './command';
import { enumerateWorkUnits, isAllowedProjection, type AllowedProjection } from './work-units';

export class StartBackfillJobHandler implements IStartBackfillJobUseCase {
  constructor(
    private readonly repo: IBackfillJobRepository,
    private readonly scopeResolver: IResolveStudentScopePort,
    private readonly topicsPort: IGetTopicsForStudentsPort,
  ) {}

  async execute(command: StartBackfillJobCommand): Promise<{ jobId: string; status: 'queued' | 'running'; createdAt: string }> {
    const projectionNames = command.projectionNames;
    if (!projectionNames.length) {
      throw new Error('projectionNames is required and must not be empty');
    }

    const validatedProjections: AllowedProjection[] = [];
    for (const name of projectionNames) {
      if (!isAllowedProjection(name)) {
        throw new Error(`Invalid projection name: ${name}. Allowed: TopicLoop, StudentAggregates, StudentPolicy`);
      }
      validatedProjections.push(name);
    }

    const studentIds = await this.scopeResolver.resolveStudentIds(command.studentIds);
    const topicsByStudent = await this.topicsPort.getTopicsByStudent(studentIds);

    const { units, total } = enumerateWorkUnits(validatedProjections, studentIds, topicsByStudent);

    const now = new Date();
    const job: BackfillJobSnapshot = {
      id: crypto.randomUUID(),
      status: 'queued',
      projectionNames: validatedProjections,
      studentIds,
      throttleOpsPerSec: command.throttleOpsPerSec ?? null,
      projectionVersion: command.projectionVersion ?? null,
      totalUnits: total,
      completedUnits: 0,
      checkpointPayload: null,
      errorMessage: null,
      createdAt: now,
      startedAt: null,
      completedAt: null,
      updatedAt: now,
    };

    await this.repo.save(job);

    return {
      jobId: job.id,
      status: 'queued',
      createdAt: job.createdAt.toISOString(),
    };
  }
}
