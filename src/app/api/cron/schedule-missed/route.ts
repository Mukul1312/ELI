/**
 * GET /api/cron/schedule-missed
 *
 * Vercel Cron: finds past-due scheduled verifications, emits ScheduleMissed.
 * Protected by CRON_SECRET header.
 */

import { NextRequest } from 'next/server';
import { emitScheduleMissed } from '@/ei/application/emit-schedule-missed/handler';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const secret = req.headers.get('authorization')?.replace('Bearer ', '') ?? req.headers.get('x-cron-secret');
  const expected = process.env.CRON_SECRET;

  if (expected && secret !== expected) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const result = await emitScheduleMissed();
  return Response.json(result);
}
