/**
 * GET /api/admin/backfill/jobs/[jobId]
 *
 * Returns backfill job status. OpsAuth-protected.
 */

import { NextRequest } from 'next/server';
import { eiStore } from '@/ei/runtime/db';
import { validateOpsAuth } from '@/ops/infrastructure/auth/ops-auth';
import { GetBackfillJobStatusHandler } from '@/ops/application/get-backfill-job-status/handler';
import { PostgresBackfillJobRepository } from '@/ops/infrastructure/persistence/backfill-job-repository.pg';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> },
) {
  if (!validateOpsAuth(req)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { jobId } = await params;

  const repo = new PostgresBackfillJobRepository(eiStore.db);
  const handler = new GetBackfillJobStatusHandler(repo);
  const result = await handler.execute(jobId);

  if (!result) {
    return Response.json({ error: 'Job not found' }, { status: 404 });
  }

  return Response.json(result);
}
