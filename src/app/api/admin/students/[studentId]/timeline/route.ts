/**
 * GET /api/admin/students/[studentId]/timeline
 *
 * Admin debug: returns last N events + aggregates for a student.
 * Requires admin role. RBAC-protected.
 */

import { NextRequest } from 'next/server';
import { eiStore } from '@/ei/runtime/db';
import { createResolveAuthSessionUseCase } from '@/lib/cohort-access';
import { createServerGetSession } from '@/lib/auth/server';
import type { CohortAccessDb } from '@/cohort-access/infrastructure/persistence/db-types';
import { queryEvents, getAggregates } from '@/ei/db/queries';

export const dynamic = 'force-dynamic';

function adaptDb(db: typeof eiStore.db): CohortAccessDb {
  return {
    one: db.one.bind(db),
    oneOrNone: db.oneOrNone.bind(db),
    many: db.many.bind(db),
    none: async (q, p) => {
      await db.none(q, p);
    },
  };
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ studentId: string }> },
) {
  const { studentId } = await params;

  const db = adaptDb(eiStore.db);
  const getSession = createServerGetSession();
  const resolveAuth = createResolveAuthSessionUseCase(db, getSession);
  const authSession = await resolveAuth.execute({ sessionContext: req });

  if (!authSession) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (authSession.role.value !== 'admin') {
    return Response.json({ error: 'Forbidden: admin role required' }, { status: 403 });
  }

  const limit = Math.min(parseInt(req.nextUrl.searchParams.get('limit') ?? '200', 10), 500);

  const [eventRows, aggregatesRow] = await Promise.all([
    queryEvents(eiStore.db, studentId, { limit }),
    getAggregates(eiStore.db, studentId),
  ]);

  const events = eventRows.map((row) => ({
    id: row.id,
    eventType: row.event_type,
    topicId: row.topic_id,
    payload: row.payload,
    occurredAt: row.occurred_at,
  }));

  const aggregates = aggregatesRow
    ? {
        pendingChecks: aggregatesRow.pending_checks,
        openLoops: aggregatesRow.open_loops,
        verificationRate7d: aggregatesRow.verification_rate_7d,
        scheduleMisses7d: aggregatesRow.schedule_misses_7d,
        silenceDays: aggregatesRow.silence_days,
      }
    : null;

  return Response.json({ events, aggregates });
}
