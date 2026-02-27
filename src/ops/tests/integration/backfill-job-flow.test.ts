/**
 * Backfill job flow integration tests: create→run→progress and failure→resume.
 *
 * Skipped unless DATABASE_URL is set. Uses real DB and projectors.
 */

import 'dotenv/config';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PostgresStore } from '@mastra/pg';
import type { EiDb } from '@/ei/runtime/db';
import { PostgresBackfillJobRepository } from '@/ops/infrastructure/persistence/backfill-job-repository.pg';
import { ProjectorEntrypointAdapter } from '@/ops/infrastructure/projector-entrypoint-adapter';
import { GetTopicsForStudentsAdapter } from '@/ops/infrastructure/topics-for-students-adapter';
import { ResolveStudentScopeAdapter } from '@/ops/infrastructure/scope-resolver-adapter';
import { StartBackfillJobHandler } from '@/ops/application/start-backfill-job/handler';
import { BackfillJobRunner } from '@/ops/application/run-backfill-job/runner';
import type { IProjectorEntrypointPort } from '@/ops/application/start-backfill-job/port';

const TEST_STUDENT_ID = 'int-test-backfill-flow';

/**
 * Projector that delegates to real implementation but throws on the Nth invocation.
 */
class FailingThenSucceedingProjectorAdapter implements IProjectorEntrypointPort {
  private callCount = 0;

  constructor(
    private readonly real: IProjectorEntrypointPort,
    private readonly failOnCallIndex: number,
  ) {}

  async recomputeTopicLoop(studentId: string, topicId: string): Promise<void> {
    if (this.callCount++ === this.failOnCallIndex) {
      throw new Error(`Simulated failure at call ${this.failOnCallIndex}`);
    }
    return this.real.recomputeTopicLoop(studentId, topicId);
  }

  async recomputeStudentAggregates(studentId: string): Promise<void> {
    if (this.callCount++ === this.failOnCallIndex) {
      throw new Error(`Simulated failure at call ${this.failOnCallIndex}`);
    }
    return this.real.recomputeStudentAggregates(studentId);
  }

  async recomputeStudentPolicy(studentId: string): Promise<void> {
    if (this.callCount++ === this.failOnCallIndex) {
      throw new Error(`Simulated failure at call ${this.failOnCallIndex}`);
    }
    return this.real.recomputeStudentPolicy(studentId);
  }
}

describe.skipIf(!process.env.DATABASE_URL)(
  'BackfillJobFlow (integration)',
  () => {
    let db: EiDb;
    let repo: PostgresBackfillJobRepository;
    let store: PostgresStore;
    let createdJobIds: string[] = [];

    beforeAll(async () => {
      store = new PostgresStore({
        id: 'ei-backfill-flow-integration-test',
        connectionString: process.env.DATABASE_URL!,
      });
      db = store.db as unknown as EiDb;
      repo = new PostgresBackfillJobRepository(db);
    });

    afterAll(async () => {
      for (const id of createdJobIds) {
        await db.none('DELETE FROM ops_backfill_jobs WHERE id = $1', [id]);
      }
    });

    it('create job → run → verify completed_units', { timeout: 15000 }, async () => {
      const scopeResolver = new ResolveStudentScopeAdapter(db);
      const topicsPort = new GetTopicsForStudentsAdapter(db);
      const startHandler = new StartBackfillJobHandler(
        repo,
        scopeResolver,
        topicsPort,
      );

      const { jobId } = await startHandler.execute({
        projectionNames: ['StudentAggregates'],
        studentIds: [TEST_STUDENT_ID],
      });
      createdJobIds.push(jobId);

      const projector = new ProjectorEntrypointAdapter(db);
      const runner = new BackfillJobRunner(repo, projector, topicsPort);

      const result = await runner.run({ jobId, throttleMs: 0 });

      expect(result.status).toBe('completed');
      expect(result.completedUnits).toBe(result.totalUnits);
      expect(result.totalUnits).toBeGreaterThanOrEqual(1);

      const job = await repo.getById(jobId);
      expect(job?.status).toBe('completed');
      expect(job?.completedUnits).toBe(job?.totalUnits);
    });

    it('failure → resume from checkpoint', { timeout: 15000 }, async () => {
      const scopeResolver = new ResolveStudentScopeAdapter(db);
      const topicsPort = new GetTopicsForStudentsAdapter(db);
      const startHandler = new StartBackfillJobHandler(
        repo,
        scopeResolver,
        topicsPort,
      );

      const { jobId } = await startHandler.execute({
        projectionNames: ['StudentAggregates', 'StudentPolicy'],
        studentIds: [TEST_STUDENT_ID],
      });
      createdJobIds.push(jobId);

      const realProjector = new ProjectorEntrypointAdapter(db);
      const failingProjector = new FailingThenSucceedingProjectorAdapter(
        realProjector,
        1,
      );
      const runner = new BackfillJobRunner(repo, failingProjector, topicsPort);

      const firstRun = await runner.run({ jobId, throttleMs: 0 });

      expect(firstRun.status).toBe('failed');
      expect(firstRun.completedUnits).toBe(1);
      expect(firstRun.totalUnits).toBe(2);
      expect(firstRun.error).toContain('Simulated failure');

      const jobAfterFail = await repo.getById(jobId);
      expect(jobAfterFail?.checkpointPayload).toEqual({
        lastCompletedUnitIndex: 0,
      });

      await repo.updateProgress(jobId, { status: 'queued' });

      const succeedingRunner = new BackfillJobRunner(
        repo,
        realProjector,
        topicsPort,
      );
      const secondRun = await succeedingRunner.run({ jobId, throttleMs: 0 });

      expect(secondRun.status).toBe('completed');
      expect(secondRun.completedUnits).toBe(2);
      expect(secondRun.totalUnits).toBe(2);

      const jobFinal = await repo.getById(jobId);
      expect(jobFinal?.status).toBe('completed');
      expect(jobFinal?.completedUnits).toBe(2);
    });
  },
);
