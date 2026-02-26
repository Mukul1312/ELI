/**
 * POST /api/admin/backfill/run
 *
 * Triggers backfill job execution. Picks next queued job or specific jobId.
 * OpsAuth-protected (cron secret or API key).
 */

import { NextRequest } from 'next/server';
import { eiStore } from '@/ei/runtime/db';
import { validateOpsAuth } from '@/ops/infrastructure/auth/ops-auth';
import { BackfillJobRunner } from '@/ops/application/run-backfill-job/runner';
import { PostgresBackfillJobRepository } from '@/ops/infrastructure/persistence/backfill-job-repository.pg';
import { ProjectorEntrypointAdapter } from '@/ops/infrastructure/projector-entrypoint-adapter';
import { GetTopicsForStudentsAdapter } from '@/ops/infrastructure/topics-for-students-adapter';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  if (!validateOpsAuth(req)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const jobId = req.nextUrl.searchParams.get('jobId');

  const db = eiStore.db;
  const repo = new PostgresBackfillJobRepository(db);

  let targetJobId: string;

  if (jobId) {
    const job = await repo.getById(jobId);
    if (!job) {
      return Response.json({ error: 'Job not found' }, { status: 404 });
    }
    if (job.status !== 'queued' && job.status !== 'running') {
      return Response.json({
        message: 'Job already finished',
        jobId,
        status: job.status,
      });
    }
    targetJobId = jobId;
  } else {
    const pick = await repo.findNextQueuedOrRunning();
    if (!pick) {
      return Response.json({ message: 'No queued or running job to execute' });
    }
    targetJobId = pick.id;
  }

  const job = await repo.getById(targetJobId);
  const throttleOpsPerSec = job?.throttleOpsPerSec ?? 10;
  const throttleMs = throttleOpsPerSec > 0 ? 1000 / throttleOpsPerSec : 0;

  const projector = new ProjectorEntrypointAdapter(db);
  const topicsPort = new GetTopicsForStudentsAdapter(db);
  const runner = new BackfillJobRunner(repo, projector, topicsPort);

  const result = await runner.run({
    jobId: targetJobId,
    throttleMs,
  });

  return Response.json(result);
}
