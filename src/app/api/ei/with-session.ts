/**
 * EI auth wrapper: resolves session via CohortAccess ResolveAuthSession.
 *
 * Status codes and gating (doc-aligned):
 * - 401 Unauthorized: only when no valid Neon Auth session exists.
 * - 200 for EI: when session is valid, including unassigned users (cohortId=null).
 * - Cohort-scoped surfaces (Radar, admin) enforce 403 when accessScope.cohortIds is empty.
 *
 * Flow: getSession → ensureAndResolve (single CTE: provision + resolve AuthSession).
 * studentId is always server-derived; never trusted from client body.
 */

import { getDb } from '@/ei/runtime/db';
import type { EiDb } from '@/ei/runtime/db';
import { createResolveAuthenticatedSessionUseCase } from '@/lib/cohort-access';
import { createServerGetSession } from '@/lib/auth/server';
import type { CohortAccessDb } from '@/cohort-access/infrastructure/persistence/db-types';
import { traceAsync } from '@/ops/infrastructure/tracing/traced-auth-adapter';
import { StructuredSpanLogger } from '@/ops/infrastructure/tracing/structured-span-logger';
import { getRequestCorrelationId } from '@/ops/infrastructure/tracing/request-context';

export type WithSessionResult =
  | { authorized: true; studentId: string }
  | { authorized: false; response: Response };

/** Adapt EI db to CohortAccessDb (none returns void instead of null). */
function adaptDb(db: EiDb): CohortAccessDb {
  return {
    one: db.one.bind(db),
    oneOrNone: db.oneOrNone.bind(db),
    many: db.many.bind(db),
    none: async (q, p) => {
      await db.none(q, p);
    },
  };
}

function logAuthResolution(entry: {
  sessionPresent: boolean;
  studentId?: string;
  cohortId?: string | null;
  role?: string;
  identityProvisioned?: boolean;
  status: 'authorized' | 'unauthorized';
  durationMs?: number;
}): void {
  const safe = {
    timestamp: new Date().toISOString(),
    event: 'auth_resolution',
    ...entry,
  };
  console.log(JSON.stringify(safe));
}

export async function withEiSession(req: Request): Promise<WithSessionResult> {
  const t0 = Date.now();
  const db = adaptDb(getDb());
  const tracer = new StructuredSpanLogger();
  const correlationId = getRequestCorrelationId() ?? 'auth';

  const getSession = createServerGetSession();
  const session = await traceAsync(tracer, correlationId, 'auth:getSession', () => getSession());

  if (!session?.user?.id) {
    logAuthResolution({ sessionPresent: false, status: 'unauthorized', durationMs: Date.now() - t0 });
    return {
      authorized: false,
      response: Response.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }

  const resolveAuthenticated = createResolveAuthenticatedSessionUseCase(db);
  const result = await traceAsync(
    tracer, correlationId, 'auth:ensureAndResolve',
    () => resolveAuthenticated.execute({ authUserId: session.user.id }),
  );

  if (result) {
    const { authSession, provisioned: identityProvisioned } = result;
    logAuthResolution({
      sessionPresent: true,
      studentId: authSession.studentId,
      cohortId: authSession.cohortId,
      role: authSession.role.value,
      identityProvisioned,
      status: 'authorized',
      durationMs: Date.now() - t0,
    });
    return { authorized: true, studentId: authSession.studentId };
  }

  logAuthResolution({ sessionPresent: true, status: 'unauthorized', durationMs: Date.now() - t0 });
  return {
    authorized: false,
    response: Response.json({ error: 'Unauthorized' }, { status: 401 }),
  };
}
