/**
 * GET /api/admin/students/[studentId]/timeline
 *
 * Platform ops debug: returns last N events + aggregates for a student.
 * OpsAuth-protected (API key, cron secret, dev bypass). No CohortAccess.
 * Events returned in chronological order (occurred_at ASC).
 *
 * Dev-only bypass: when NODE_ENV=development, auth may be skipped. If
 * OPS_DEV_BYPASS_SECRET is set, send X-Ops-Dev-Bypass or Authorization: Bearer.
 * Never active in production.
 */

import { NextRequest } from 'next/server';
import { eiStore } from '@/ei/runtime/db';
import { validateOpsAuth } from '@/ops/infrastructure/auth/ops-auth';
import { GetStudentTimelineHandler } from '@/ops/application/get-student-timeline/handler';
import { LedgerTimelineAdapter } from '@/ops/infrastructure/persistence/ledger-timeline-adapter';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ studentId: string }> },
) {
  const { studentId } = await params;

  if (!validateOpsAuth(req)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const raw = parseInt(req.nextUrl.searchParams.get('limit') ?? '200', 10);
  const limitParam = Number.isFinite(raw) ? raw : undefined;
  const adapter = new LedgerTimelineAdapter(eiStore.db);
  const handler = new GetStudentTimelineHandler(adapter);
  const { events, aggregates } = await handler.execute({ studentId, limit: limitParam });

  const aggregatesDto = aggregates
    ? {
        pendingChecks: aggregates.pending_checks,
        openLoops: aggregates.open_loops,
        verificationRate7d: aggregates.verification_rate_7d,
        scheduleMisses7d: aggregates.schedule_misses_7d,
        silenceDays: aggregates.silence_days,
      }
    : null;

  return Response.json({
    events: events.map((e) => ({
      id: e.id,
      eventType: e.eventType,
      topicId: e.topicId,
      payload: e.payload,
      occurredAt: e.occurredAt,
    })),
    aggregates: aggregatesDto,
  });
}
