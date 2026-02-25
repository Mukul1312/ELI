/**
 * EI auth wrapper: resolves session via CohortAccess ResolveAuthSession.
 *
 * Status codes and gating (doc-aligned):
 * - 401 Unauthorized: only when no valid Neon Auth session exists.
 * - 200 for EI: when session is valid, including unassigned users (cohortId=null).
 * - Cohort-scoped surfaces (Radar, admin) enforce 403 when accessScope.cohortIds is empty.
 *
 * Flow: getSession → ensure identity mapping exists → resolve AuthSession.
 * studentId is always server-derived; never trusted from client body.
 */

import { eiStore } from '@/ei/runtime/db';
import {
  createEnsureStudentIdentityUseCase,
  createResolveAuthSessionUseCase,
} from '@/lib/cohort-access';
import { createServerGetSession } from '@/lib/auth/server';
import type { CohortAccessDb } from '@/cohort-access/infrastructure/persistence/db-types';

export type WithSessionResult =
  | { authorized: true; studentId: string }
  | { authorized: false; response: Response };

/** Adapt EI db to CohortAccessDb (none returns void instead of null). */
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

function logAuthResolution(entry: {
  sessionPresent: boolean;
  studentId?: string;
  cohortId?: string | null;
  role?: string;
  identityProvisioned?: boolean;
  status: 'authorized' | 'unauthorized';
}): void {
  const safe = {
    timestamp: new Date().toISOString(),
    event: 'auth_resolution',
    ...entry,
  };
  console.log(JSON.stringify(safe));
}

export async function withEiSession(req: Request): Promise<WithSessionResult> {
  const db = adaptDb(eiStore.db);
  const getSession = createServerGetSession();
  const session = await getSession();

  if (!session?.user?.id) {
    logAuthResolution({ sessionPresent: false, status: 'unauthorized' });
    return {
      authorized: false,
      response: Response.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }

  const ensureIdentity = createEnsureStudentIdentityUseCase(db);
  const { provisioned: identityProvisioned } = await ensureIdentity.execute({
    authUserId: session.user.id,
  });

  const resolveAuth = createResolveAuthSessionUseCase(db, getSession);
  const authSession = await resolveAuth.execute({ sessionContext: req });

  if (authSession) {
    logAuthResolution({
      sessionPresent: true,
      studentId: authSession.studentId,
      cohortId: authSession.cohortId,
      role: authSession.role.value,
      identityProvisioned,
      status: 'authorized',
    });
    return { authorized: true, studentId: authSession.studentId };
  }

  logAuthResolution({ sessionPresent: true, identityProvisioned, status: 'unauthorized' });
  return {
    authorized: false,
    response: Response.json({ error: 'Unauthorized' }, { status: 401 }),
  };
}
