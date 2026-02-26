/**
 * POST /api/admin/backfill/jobs/[jobId]/cancel
 *
 * Cancels a queued or running backfill job. OpsAuth-protected.
 */

import { NextRequest } from 'next/server';
import { eiStore } from '@/ei/runtime/db';
import { validateOpsAuth } from '@/ops/infrastructure/auth/ops-auth';
import { CancelBackfillJobHandler } from '@/ops/application/cancel-backfill-job/handler';
import { PostgresBackfillJobRepository } from '@/ops/infrastructure/persistence/backfill-job-repository.pg';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> },
) {
  if (!validateOpsAuth(req)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { jobId } = await params;

  const repo = new PostgresBackfillJobRepository(eiStore.db);
  const handler = new CancelBackfillJobHandler(repo);
  const result = await handler.execute(jobId);

  if (!result) {
    return Response.json({ error: 'Job not found or already completed' }, { status: 404 });
  }

  return Response.json(result);
}
