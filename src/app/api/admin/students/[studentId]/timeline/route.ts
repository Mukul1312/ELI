/**
 * GET /api/admin/students/[studentId]/timeline
 *
 * Admin debug: returns last N events + aggregates for a student.
 * Requires admin role. RBAC-protected.
 * Events returned in chronological order (occurred_at ASC).
 *
 * Dev-only bypass: when NODE_ENV=development, auth may be skipped. If
 * OPS_DEV_BYPASS_SECRET is set, send X-Ops-Dev-Bypass or Authorization: Bearer.
 * Never active in production.
 */

import { NextRequest } from 'next/server';
import { eiStore } from '@/ei/runtime/db';
import { createResolveAuthSessionUseCase } from '@/lib/cohort-access';
import { createServerGetSession } from '@/lib/auth/server';
import type { CohortAccessDb } from '@/cohort-access/infrastructure/persistence/db-types';
import { GetStudentTimelineHandler } from '@/ops/application/get-student-timeline/handler';
import { LedgerTimelineAdapter } from '@/ops/infrastructure/persistence/ledger-timeline-adapter';

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

  // Dev-only bypass: skip auth when NODE_ENV=development. Optional OPS_DEV_BYPASS_SECRET.
  const isDevBypass =
    process.env.NODE_ENV === 'development' &&
    (() => {
      const expected = process.env.OPS_DEV_BYPASS_SECRET;
      if (!expected) return true;
      const secret =
        req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ??
        req.headers.get('x-ops-dev-bypass');
      return secret === expected;
    })();

  if (!isDevBypass) {
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

    // Tenant isolation: cohort-scoped admins may only access students in their cohorts.
    const { accessScope } = authSession;
    if (accessScope.scope === 'cohort' && accessScope.cohortIds.length > 0) {
      const membershipRow = await db.oneOrNone<{ cohort_id: string | null }>(
        'SELECT cohort_id FROM student_cohort_membership WHERE student_id = $1',
        [studentId],
      );
      const studentCohortId = membershipRow?.cohort_id ?? null;
      if (!studentCohortId || !accessScope.cohortIds.includes(studentCohortId)) {
        return Response.json(
          { error: 'Forbidden: student not in your cohort scope' },
          { status: 403 },
        );
      }
    }
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
