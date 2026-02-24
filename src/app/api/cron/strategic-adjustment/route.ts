/**
 * GET /api/cron/strategic-adjustment
 *
 * Vercel Cron: triggers strategic-adjustment workflow for eligible students.
 * Runs for up to 50 students active in the last 30 days.
 * Protected by CRON_SECRET header.
 */

import { NextRequest } from 'next/server';
import { eiStore } from '@/ei/runtime/db';
import { listActiveStudents } from '@/ei/db/queries';
import { strategicAdjustmentWorkflow } from '@/mastra/workflows/strategic-adjustment';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const BATCH_LIMIT = 50;

export async function GET(req: NextRequest) {
  const secret = req.headers.get('authorization')?.replace('Bearer ', '') ?? req.headers.get('x-cron-secret');
  const expected = process.env.CRON_SECRET;

  if (expected && secret !== expected) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const studentIds = await listActiveStudents(eiStore.db, 30);
  const batch = studentIds.slice(0, BATCH_LIMIT);

  const results: Array<{ studentId: string; status: string }> = [];
  for (const studentId of batch) {
    try {
      const run = await strategicAdjustmentWorkflow.createRun();
      await run.start({
        inputData: { studentId, trigger: 'scheduled' },
      });
      results.push({ studentId, status: 'ok' });
    } catch (err) {
      results.push({
        studentId,
        status: err instanceof Error ? err.message : 'error',
      });
    }
  }

  return Response.json({ processed: results.length, total: studentIds.length, results });
}
