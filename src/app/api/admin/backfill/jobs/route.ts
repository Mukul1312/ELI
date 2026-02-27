/**
 * POST /api/admin/backfill/jobs
 *
 * Creates a new backfill job. OpsAuth-protected.
 * Body: { projectionNames: string[], studentIds?: string[], throttle?: number }
 */

import { NextRequest } from 'next/server';
import { eiStore } from '@/ei/runtime/db';
import { validateOpsAuth } from '@/ops/infrastructure/auth/ops-auth';
import { StartBackfillJobHandler } from '@/ops/application/start-backfill-job/handler';
import { PostgresBackfillJobRepository } from '@/ops/infrastructure/persistence/backfill-job-repository.pg';
import { ResolveStudentScopeAdapter } from '@/ops/infrastructure/scope-resolver-adapter';
import { GetTopicsForStudentsAdapter } from '@/ops/infrastructure/topics-for-students-adapter';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  if (!validateOpsAuth(req)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { projectionNames?: string[]; studentIds?: string[]; throttle?: number };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const projectionNames = body.projectionNames;
  if (!Array.isArray(projectionNames) || projectionNames.length === 0) {
    return Response.json({ error: 'projectionNames is required and must be a non-empty array' }, { status: 400 });
  }

  const studentIds = Array.isArray(body.studentIds) ? body.studentIds : [];
  const throttleOpsPerSec = typeof body.throttle === 'number' && body.throttle > 0 ? body.throttle : undefined;

  const db = eiStore.db;
  const repo = new PostgresBackfillJobRepository(db);
  const scopeResolver = new ResolveStudentScopeAdapter(db);
  const topicsPort = new GetTopicsForStudentsAdapter(db);
  const handler = new StartBackfillJobHandler(repo, scopeResolver, topicsPort);

  try {
    const result = await handler.execute({
      projectionNames,
      studentIds,
      throttleOpsPerSec,
    });
    return Response.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: message }, { status: 400 });
  }
}
