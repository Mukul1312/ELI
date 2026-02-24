/**
 * GET /api/cron/radar-recompute
 *
 * Vercel Cron: triggers radar recompute workflow.
 * Protected by CRON_SECRET header.
 */

import { NextRequest } from 'next/server';
import { radarRecomputeWorkflow } from '@/mastra/workflows/radar-recompute';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function GET(req: NextRequest) {
  const secret = req.headers.get('authorization')?.replace('Bearer ', '') ?? req.headers.get('x-cron-secret');
  const expected = process.env.CRON_SECRET;

  if (expected && secret !== expected) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const run = await radarRecomputeWorkflow.createRun();
  const result = await run.start({
    inputData: { batchId: `cron-${Date.now()}`, activeWithinDays: 30 },
  });

  return Response.json(result);
}
