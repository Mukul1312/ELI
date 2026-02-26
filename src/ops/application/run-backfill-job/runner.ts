/**
 * BackfillJobRunner — executes a backfill job with checkpoint resume.
 * Invokes IProjectorEntrypointPort for each work unit; persists progress.
 * Per ops-observability-tactical-spec.md.
 */

import type {
  IBackfillJobRepository,
  IProjectorEntrypointPort,
  IGetTopicsForStudentsPort,
  BackfillCheckpoint,
} from '@/ops/application/start-backfill-job/port';
import { enumerateWorkUnits, type AllowedProjection } from '@/ops/application/start-backfill-job/work-units';

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface RunBackfillJobOptions {
  jobId: string;
  throttleMs?: number;
}

export interface RunBackfillJobResult {
  jobId: string;
  status: 'completed' | 'cancelled' | 'failed';
  completedUnits: number;
  totalUnits: number;
  error?: string;
}

export class BackfillJobRunner {
  constructor(
    private readonly repo: IBackfillJobRepository,
    private readonly projector: IProjectorEntrypointPort,
    private readonly topicsPort: IGetTopicsForStudentsPort,
  ) {}

  async run(options: RunBackfillJobOptions): Promise<RunBackfillJobResult> {
    const { jobId, throttleMs } = options;

    const job = await this.repo.getById(jobId);
    if (!job) {
      throw new Error(`Job not found: ${jobId}`);
    }
    if (job.status !== 'queued' && job.status !== 'running') {
      return {
        jobId,
        status: job.status as 'completed' | 'cancelled' | 'failed',
        completedUnits: job.completedUnits,
        totalUnits: job.totalUnits ?? 0,
        error: job.errorMessage ?? undefined,
      };
    }

    await this.repo.updateProgress(jobId, {
      status: 'running',
      startedAt: new Date(),
    });

    const topicsByStudent = await this.topicsPort.getTopicsByStudent(job.studentIds);
    const { units } = enumerateWorkUnits(
      job.projectionNames as AllowedProjection[],
      job.studentIds,
      topicsByStudent,
    );

    let startIndex = 0;
    if (job.checkpointPayload?.lastCompletedUnitIndex != null) {
      startIndex = job.checkpointPayload.lastCompletedUnitIndex + 1;
    }

    for (let i = startIndex; i < units.length; i++) {
      const current = await this.repo.getById(jobId);
      if (!current || current.status === 'cancelled') {
        return {
          jobId,
          status: 'cancelled',
          completedUnits: job.completedUnits,
          totalUnits: units.length,
        };
      }

      const unit = units[i];

      try {
        if (unit.projection === 'TopicLoop' && unit.topicId) {
          await this.projector.recomputeTopicLoop(unit.studentId, unit.topicId);
        } else if (unit.projection === 'StudentAggregates') {
          await this.projector.recomputeStudentAggregates(unit.studentId);
        } else if (unit.projection === 'StudentPolicy') {
          await this.projector.recomputeStudentPolicy(unit.studentId);
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        await this.repo.updateProgress(jobId, {
          status: 'failed',
          errorMessage,
          completedAt: new Date(),
        });
        return {
          jobId,
          status: 'failed',
          completedUnits: i,
          totalUnits: units.length,
          error: errorMessage,
        };
      }

      const completedUnits = i + 1;
      const checkpointPayload: BackfillCheckpoint = {
        lastCompletedUnitIndex: i,
      };

      await this.repo.updateProgress(jobId, {
        completedUnits,
        checkpointPayload,
      });

      if (throttleMs && throttleMs > 0) {
        await sleep(throttleMs);
      }
    }

    await this.repo.updateProgress(jobId, {
      status: 'completed',
      completedAt: new Date(),
    });

    return {
      jobId,
      status: 'completed',
      completedUnits: units.length,
      totalUnits: units.length,
    };
  }
}
